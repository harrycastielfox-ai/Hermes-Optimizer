create table public.device_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_device_hash text not null check (current_device_hash ~ '^[a-f0-9]{64}$'),
  requested_device_hash text not null check (requested_device_hash ~ '^[a-f0-9]{64}$'),
  requested_device_label text not null check (char_length(requested_device_label) <= 120),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text check (char_length(review_note) <= 500)
);

create unique index device_transfer_one_pending_per_user_idx
on public.device_transfer_requests(user_id)
where status = 'pending';

create index device_transfer_user_requested_at_idx
on public.device_transfer_requests(user_id, requested_at desc);

alter table public.device_transfer_requests enable row level security;

create policy "users read their device transfer requests"
on public.device_transfer_requests
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.device_transfer_requests from anon, authenticated;
grant select on public.device_transfer_requests to authenticated;

create or replace function public.request_device_transfer(
  requested_device_fingerprint text,
  requested_device_name text default 'Novo PC Windows'
)
returns table (
  transfer_request_id uuid,
  transfer_status text,
  transfer_requested_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_requested_hash text := lower(trim(coalesce(requested_device_fingerprint, '')));
  v_requested_label text := left(trim(coalesce(requested_device_name, 'Novo PC Windows')), 120);
  v_current_hash text;
  v_entitlement_status text;
  v_entitlement_expires_at timestamptz;
  v_existing_id uuid;
  v_existing_hash text;
  v_existing_requested_at timestamptz;
  v_recent_requests integer;
  v_request_id uuid;
  v_requested_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'google' then
    raise exception 'GOOGLE_AUTH_REQUIRED';
  end if;

  if v_requested_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_DEVICE';
  end if;

  select e.status, e.expires_at
    into v_entitlement_status, v_entitlement_expires_at
  from public.entitlements e
  where e.user_id = v_user_id;

  if v_entitlement_status is null then
    raise exception 'NO_ENTITLEMENT';
  end if;
  if v_entitlement_status <> 'active' or v_entitlement_expires_at <= now() then
    raise exception 'TRANSFER_LICENSE_INACTIVE';
  end if;

  select d.device_hash
    into v_current_hash
  from public.licensed_devices d
  where d.user_id = v_user_id;

  if v_current_hash is null then
    raise exception 'LICENSE_DEVICE_NOT_BOUND';
  end if;
  if v_current_hash = v_requested_hash then
    raise exception 'ALREADY_THIS_DEVICE';
  end if;

  update public.device_transfer_requests
  set status = 'expired', reviewed_at = now(), review_note = 'Expirado automaticamente.'
  where user_id = v_user_id
    and status = 'pending'
    and requested_at <= now() - interval '7 days';

  select r.id, r.requested_device_hash, r.requested_at
    into v_existing_id, v_existing_hash, v_existing_requested_at
  from public.device_transfer_requests r
  where r.user_id = v_user_id and r.status = 'pending'
  for update;

  if v_existing_id is not null then
    if v_existing_hash = v_requested_hash then
      return query select v_existing_id, 'pending'::text, v_existing_requested_at;
      return;
    end if;
    raise exception 'TRANSFER_ALREADY_PENDING';
  end if;

  select count(*)::integer
    into v_recent_requests
  from public.device_transfer_requests r
  where r.user_id = v_user_id
    and r.requested_at > now() - interval '30 days';

  if v_recent_requests >= 3 then
    raise exception 'TRANSFER_RATE_LIMITED';
  end if;

  insert into public.device_transfer_requests (
    user_id,
    current_device_hash,
    requested_device_hash,
    requested_device_label
  )
  values (
    v_user_id,
    v_current_hash,
    v_requested_hash,
    case when v_requested_label = '' then 'Novo PC Windows' else v_requested_label end
  )
  returning id, requested_at into v_request_id, v_requested_at;

  return query select v_request_id, 'pending'::text, v_requested_at;
end;
$$;

create or replace function public.cancel_device_transfer(transfer_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'google' then
    raise exception 'GOOGLE_AUTH_REQUIRED';
  end if;

  update public.device_transfer_requests
  set status = 'cancelled', reviewed_at = now(), review_note = 'Cancelado pelo usuario.'
  where id = transfer_request_id
    and user_id = v_user_id
    and status = 'pending';

  return found;
end;
$$;

create or replace function public.review_device_transfer(
  transfer_request_id uuid,
  transfer_decision text,
  reviewer_reference text,
  reviewer_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.device_transfer_requests%rowtype;
  v_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if v_role <> 'service_role' then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if transfer_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_TRANSFER_DECISION';
  end if;

  select *
    into v_request
  from public.device_transfer_requests
  where id = transfer_request_id
  for update;

  if v_request.id is null or v_request.status <> 'pending' then
    raise exception 'TRANSFER_NOT_PENDING';
  end if;
  if v_request.requested_at <= now() - interval '7 days' then
    update public.device_transfer_requests
    set status = 'expired', reviewed_at = now(), reviewed_by = reviewer_reference,
      review_note = 'Expirado antes da analise.'
    where id = transfer_request_id;
    return 'expired';
  end if;

  if transfer_decision = 'approved' then
    if not exists (
      select 1
      from public.entitlements e
      where e.user_id = v_request.user_id
        and e.status = 'active'
        and e.expires_at > now()
    ) then
      raise exception 'TRANSFER_LICENSE_INACTIVE';
    end if;

    update public.licensed_devices
    set
      device_hash = v_request.requested_device_hash,
      device_label = v_request.requested_device_label,
      bound_at = now(),
      last_seen_at = now()
    where user_id = v_request.user_id
      and device_hash = v_request.current_device_hash;

    if not found then
      raise exception 'LICENSE_DEVICE_CHANGED';
    end if;
  end if;

  update public.device_transfer_requests
  set
    status = transfer_decision,
    reviewed_at = now(),
    reviewed_by = left(coalesce(reviewer_reference, 'support'), 120),
    review_note = left(reviewer_note, 500)
  where id = transfer_request_id;

  return transfer_decision;
end;
$$;

revoke all on function public.request_device_transfer(text, text) from public;
revoke all on function public.request_device_transfer(text, text) from anon;
grant execute on function public.request_device_transfer(text, text) to authenticated;

revoke all on function public.cancel_device_transfer(uuid) from public;
revoke all on function public.cancel_device_transfer(uuid) from anon;
grant execute on function public.cancel_device_transfer(uuid) to authenticated;

revoke all on function public.review_device_transfer(uuid, text, text, text) from public;
revoke all on function public.review_device_transfer(uuid, text, text, text) from anon;
revoke all on function public.review_device_transfer(uuid, text, text, text) from authenticated;
grant execute on function public.review_device_transfer(uuid, text, text, text) to service_role;

comment on table public.device_transfer_requests is
  'Pedidos auditaveis para mover uma licenca entre computadores. O usuario nao pode aprovar o proprio pedido.';
comment on function public.review_device_transfer(uuid, text, text, text) is
  'Aprovacao atomica acessivel somente por backend confiavel usando service_role.';
