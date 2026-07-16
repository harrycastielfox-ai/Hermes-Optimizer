create table public.licensed_devices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_hash text not null check (device_hash ~ '^[a-f0-9]{64}$'),
  device_label text not null default 'PC Windows' check (char_length(device_label) <= 120),
  bound_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.license_codes
add column assigned_email_hash text
check (assigned_email_hash ~ '^[a-f0-9]{64}$');

create index licensed_devices_device_hash_idx on public.licensed_devices(device_hash);

alter table public.licensed_devices enable row level security;

create policy "users read their licensed device"
on public.licensed_devices
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.licensed_devices from anon, authenticated;
grant select on public.licensed_devices to authenticated;

drop function if exists public.redeem_license_code(text);

create or replace function public.redeem_license_code(
  redemption_code text,
  device_fingerprint text,
  requested_device_label text default 'PC Windows'
)
returns table (
  redeemed_plan_id text,
  redeemed_plan_name text,
  access_expires_at timestamptz,
  days_remaining integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized_code text;
  v_code_hash text;
  v_account_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_account_email_hash text;
  v_assigned_email_hash text;
  v_device_hash text := lower(trim(coalesce(device_fingerprint, '')));
  v_device_label text := left(trim(coalesce(requested_device_label, 'PC Windows')), 120);
  v_bound_device_hash text;
  v_code_id uuid;
  v_plan_id text;
  v_plan_name text;
  v_duration_days integer;
  v_code_expires_at timestamptz;
  v_previous_expires_at timestamptz;
  v_new_expires_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'google' then
    raise exception 'GOOGLE_AUTH_REQUIRED';
  end if;

  if v_device_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_DEVICE';
  end if;

  if v_account_email = '' then
    raise exception 'ACCOUNT_EMAIL_REQUIRED';
  end if;

  v_account_email_hash := encode(
    extensions.digest(convert_to(v_account_email, 'UTF8'), 'sha256'),
    'hex'
  );

  v_normalized_code := upper(regexp_replace(coalesce(redemption_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_normalized_code) < 8 then
    raise exception 'INVALID_CODE';
  end if;

  v_code_hash := encode(extensions.digest(convert_to(v_normalized_code, 'UTF8'), 'sha256'), 'hex');

  select c.id, c.plan_id, p.name, p.duration_days, c.expires_at, c.assigned_email_hash
    into v_code_id, v_plan_id, v_plan_name, v_duration_days, v_code_expires_at,
      v_assigned_email_hash
  from public.license_codes c
  join public.plans p on p.id = c.plan_id and p.active = true
  where c.code_hash = v_code_hash
    and c.status = 'available'
  for update of c;

  if v_code_id is null then
    raise exception 'CODE_INVALID_OR_ALREADY_USED';
  end if;

  if v_code_expires_at is not null and v_code_expires_at <= now() then
    raise exception 'CODE_EXPIRED';
  end if;

  if v_assigned_email_hash is null then
    raise exception 'CODE_NOT_ASSIGNED';
  end if;

  if v_assigned_email_hash is distinct from v_account_email_hash then
    raise exception 'CODE_ASSIGNED_TO_ANOTHER_ACCOUNT';
  end if;

  insert into public.licensed_devices (user_id, device_hash, device_label)
  values (
    v_user_id,
    v_device_hash,
    case when v_device_label = '' then 'PC Windows' else v_device_label end
  )
  on conflict (user_id) do nothing;

  select d.device_hash
    into v_bound_device_hash
  from public.licensed_devices d
  where d.user_id = v_user_id
  for update;

  if v_bound_device_hash is distinct from v_device_hash then
    raise exception 'DEVICE_ALREADY_BOUND';
  end if;

  update public.licensed_devices
  set last_seen_at = now()
  where user_id = v_user_id;

  select e.expires_at
    into v_previous_expires_at
  from public.entitlements e
  where e.user_id = v_user_id
  for update;

  v_new_expires_at := greatest(coalesce(v_previous_expires_at, now()), now())
    + make_interval(days => v_duration_days);

  insert into public.entitlements (
    user_id,
    plan_id,
    status,
    starts_at,
    expires_at,
    source_code_id,
    updated_at
  )
  values (
    v_user_id,
    v_plan_id,
    'active',
    now(),
    v_new_expires_at,
    v_code_id,
    now()
  )
  on conflict (user_id) do update
  set
    plan_id = excluded.plan_id,
    status = 'active',
    expires_at = excluded.expires_at,
    source_code_id = excluded.source_code_id,
    updated_at = now();

  update public.license_codes
  set
    status = 'redeemed',
    redeemed_by = v_user_id,
    redeemed_at = now()
  where id = v_code_id;

  insert into public.license_redemptions (
    code_id,
    user_id,
    plan_id,
    previous_expires_at,
    new_expires_at
  )
  values (
    v_code_id,
    v_user_id,
    v_plan_id,
    v_previous_expires_at,
    v_new_expires_at
  );

  return query
  select
    v_plan_id,
    v_plan_name,
    v_new_expires_at,
    greatest(0, ceil(extract(epoch from (v_new_expires_at - now())) / 86400.0)::integer);
end;
$$;

create or replace function public.get_device_entitlement(
  device_fingerprint text,
  requested_device_label text default 'PC Windows'
)
returns table (
  access_allowed boolean,
  access_reason text,
  license_user_id uuid,
  license_plan_id text,
  license_plan_name text,
  license_status text,
  license_starts_at timestamptz,
  license_expires_at timestamptz,
  licensed_device_label text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_device_hash text := lower(trim(coalesce(device_fingerprint, '')));
  v_device_label text := left(trim(coalesce(requested_device_label, 'PC Windows')), 120);
  v_bound_device_hash text;
  v_bound_device_label text;
  v_plan_id text;
  v_plan_name text;
  v_status text;
  v_starts_at timestamptz;
  v_expires_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'google' then
    raise exception 'GOOGLE_AUTH_REQUIRED';
  end if;

  if v_device_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_DEVICE';
  end if;

  select e.plan_id, p.name, e.status, e.starts_at, e.expires_at
    into v_plan_id, v_plan_name, v_status, v_starts_at, v_expires_at
  from public.entitlements e
  join public.plans p on p.id = e.plan_id
  where e.user_id = v_user_id;

  if v_plan_id is null then
    return query select false, 'NO_ENTITLEMENT', v_user_id, null::text, null::text,
      null::text, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;

  if v_status = 'revoked' then
    return query select false, 'REVOKED', v_user_id, v_plan_id, v_plan_name,
      v_status, v_starts_at, v_expires_at, null::text;
    return;
  end if;

  if v_expires_at <= now() then
    return query select false, 'EXPIRED', v_user_id, v_plan_id, v_plan_name,
      'expired'::text, v_starts_at, v_expires_at, null::text;
    return;
  end if;

  insert into public.licensed_devices (user_id, device_hash, device_label)
  values (
    v_user_id,
    v_device_hash,
    case when v_device_label = '' then 'PC Windows' else v_device_label end
  )
  on conflict (user_id) do nothing;

  select d.device_hash, d.device_label
    into v_bound_device_hash, v_bound_device_label
  from public.licensed_devices d
  where d.user_id = v_user_id
  for update;

  if v_bound_device_hash is distinct from v_device_hash then
    return query select false, 'DEVICE_MISMATCH', v_user_id, v_plan_id, v_plan_name,
      v_status, v_starts_at, v_expires_at, v_bound_device_label;
    return;
  end if;

  update public.licensed_devices
  set last_seen_at = now()
  where user_id = v_user_id;

  return query select true, 'ALLOWED', v_user_id, v_plan_id, v_plan_name,
    v_status, v_starts_at, v_expires_at, v_bound_device_label;
end;
$$;

revoke all on function public.redeem_license_code(text, text, text) from public;
revoke all on function public.redeem_license_code(text, text, text) from anon;
grant execute on function public.redeem_license_code(text, text, text) to authenticated;

revoke all on function public.get_device_entitlement(text, text) from public;
revoke all on function public.get_device_entitlement(text, text) from anon;
grant execute on function public.get_device_entitlement(text, text) to authenticated;

comment on table public.licensed_devices is
  'Vincula cada conta ao primeiro dispositivo ativado. Somente o hash derivado do dispositivo e armazenado.';
comment on column public.license_codes.assigned_email_hash is
  'SHA-256 do e-mail normalizado do comprador. O codigo so pode ser resgatado pela conta correspondente.';
comment on function public.get_device_entitlement(text, text) is
  'Valida assinatura e dispositivo em uma unica operacao executada no servidor.';
