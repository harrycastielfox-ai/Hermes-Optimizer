create table public.license_admin_audit (
  id uuid primary key default gen_random_uuid(),
  action text not null check (
    action in (
      'code_created',
      'license_revoked',
      'device_transfer_approved',
      'device_transfer_rejected',
      'device_transfer_expired'
    )
  ),
  actor_email text not null check (char_length(actor_email) <= 320),
  target_type text not null check (char_length(target_type) <= 80),
  target_id text not null check (char_length(target_id) <= 160),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index license_admin_audit_created_at_idx
on public.license_admin_audit(created_at desc);

alter table public.license_admin_audit enable row level security;
revoke all on public.license_admin_audit from anon, authenticated;

create or replace function public.admin_create_license_code(
  requested_plan_id text,
  assigned_email text,
  actor_email text,
  code_expires_at timestamptz default null,
  code_note text default null
)
returns table (
  code_id uuid,
  plain_code text,
  plan_id text,
  plan_name text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_email text := lower(trim(coalesce(assigned_email, '')));
  v_actor text := lower(trim(coalesce(actor_email, '')));
  v_random text;
  v_plain_code text;
  v_normalized_code text;
  v_code_hash text;
  v_email_hash text;
  v_code_id uuid;
  v_plan_name text;
begin
  if v_role <> 'service_role' then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'INVALID_ASSIGNED_EMAIL';
  end if;
  if v_actor = '' then
    raise exception 'INVALID_ADMIN_EMAIL';
  end if;
  if code_expires_at is not null and code_expires_at <= now() then
    raise exception 'INVALID_CODE_EXPIRATION';
  end if;

  select p.name
    into v_plan_name
  from public.plans p
  where p.id = requested_plan_id and p.active = true;

  if v_plan_name is null then
    raise exception 'INVALID_PLAN';
  end if;

  v_random := upper(encode(extensions.gen_random_bytes(10), 'hex'));
  v_plain_code := 'NEX-' || substr(v_random, 1, 5) || '-' || substr(v_random, 6, 5)
    || '-' || substr(v_random, 11, 5) || '-' || substr(v_random, 16, 5);
  v_normalized_code := upper(regexp_replace(v_plain_code, '[^A-Za-z0-9]', '', 'g'));
  v_code_hash := encode(
    extensions.digest(convert_to(v_normalized_code, 'UTF8'), 'sha256'),
    'hex'
  );
  v_email_hash := encode(
    extensions.digest(convert_to(v_email, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.license_codes (
    code_hash,
    plan_id,
    assigned_email_hash,
    expires_at,
    note
  )
  values (
    v_code_hash,
    requested_plan_id,
    v_email_hash,
    code_expires_at,
    left(code_note, 500)
  )
  returning id into v_code_id;

  insert into public.license_admin_audit (
    action,
    actor_email,
    target_type,
    target_id,
    metadata
  )
  values (
    'code_created',
    v_actor,
    'license_code',
    v_code_id::text,
    jsonb_build_object(
      'plan_id', requested_plan_id,
      'assigned_email_hash', v_email_hash,
      'expires_at', code_expires_at
    )
  );

  return query select v_code_id, v_plain_code, requested_plan_id, v_plan_name, code_expires_at;
end;
$$;

create or replace function public.admin_review_device_transfer(
  transfer_request_id uuid,
  transfer_decision text,
  actor_email text,
  reviewer_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_actor text := lower(trim(coalesce(actor_email, '')));
  v_result text;
begin
  if v_role <> 'service_role' then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if v_actor = '' then
    raise exception 'INVALID_ADMIN_EMAIL';
  end if;

  v_result := public.review_device_transfer(
    transfer_request_id,
    transfer_decision,
    v_actor,
    reviewer_note
  );

  insert into public.license_admin_audit (
    action,
    actor_email,
    target_type,
    target_id,
    metadata
  )
  values (
    case v_result
      when 'approved' then 'device_transfer_approved'
      when 'expired' then 'device_transfer_expired'
      else 'device_transfer_rejected'
    end,
    v_actor,
    'device_transfer',
    transfer_request_id::text,
    jsonb_build_object('decision', v_result, 'note', reviewer_note)
  );

  return v_result;
end;
$$;

create or replace function public.admin_revoke_entitlement(
  target_user_id uuid,
  actor_email text,
  revoke_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_actor text := lower(trim(coalesce(actor_email, '')));
begin
  if v_role <> 'service_role' then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if v_actor = '' then
    raise exception 'INVALID_ADMIN_EMAIL';
  end if;

  update public.entitlements
  set status = 'revoked', updated_at = now()
  where user_id = target_user_id and status <> 'revoked';

  if not found then
    return false;
  end if;

  insert into public.license_admin_audit (
    action,
    actor_email,
    target_type,
    target_id,
    metadata
  )
  values (
    'license_revoked',
    v_actor,
    'entitlement',
    target_user_id::text,
    jsonb_build_object('reason', revoke_reason)
  );

  return true;
end;
$$;

revoke all on function public.admin_create_license_code(text, text, text, timestamptz, text)
from public, anon, authenticated;
grant execute on function public.admin_create_license_code(text, text, text, timestamptz, text)
to service_role;

revoke all on function public.admin_review_device_transfer(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.admin_review_device_transfer(uuid, text, text, text)
to service_role;

revoke all on function public.admin_revoke_entitlement(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.admin_revoke_entitlement(uuid, text, text)
to service_role;

comment on table public.license_admin_audit is
  'Auditoria imutavel das operacoes administrativas de licenciamento. Nunca armazena o codigo em texto puro.';
comment on function public.admin_create_license_code(text, text, text, timestamptz, text) is
  'Gera um codigo de uso unico, retorna o texto somente na criacao e persiste apenas SHA-256.';
