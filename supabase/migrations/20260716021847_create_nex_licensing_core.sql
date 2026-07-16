create extension if not exists pgcrypto with schema extensions;

create table public.plans (
  id text primary key,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price_cents integer not null check (price_cents > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.license_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  plan_id text not null references public.plans(id),
  status text not null default 'available' check (status in ('available', 'redeemed', 'revoked')),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  note text
);

create table public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'active' check (status in ('active', 'revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source_code_id uuid references public.license_codes(id),
  updated_at timestamptz not null default now()
);

create table public.license_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null unique references public.license_codes(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  previous_expires_at timestamptz,
  new_expires_at timestamptz not null,
  redeemed_at timestamptz not null default now()
);

create index license_codes_status_idx on public.license_codes(status);
create index entitlements_expires_at_idx on public.entitlements(expires_at);
create index license_redemptions_user_id_idx on public.license_redemptions(user_id);

insert into public.plans (id, name, duration_days, price_cents, sort_order)
values
  ('15_days', '15 dias', 15, 1729, 10),
  ('30_days', '30 dias', 30, 3458, 20),
  ('3_months', '3 meses', 90, 8990, 30),
  ('6_months', '6 meses', 180, 15990, 40),
  ('1_year', '1 ano', 365, 27990, 50)
on conflict (id) do update
set
  name = excluded.name,
  duration_days = excluded.duration_days,
  price_cents = excluded.price_cents,
  sort_order = excluded.sort_order;

alter table public.plans enable row level security;
alter table public.license_codes enable row level security;
alter table public.entitlements enable row level security;
alter table public.license_redemptions enable row level security;

create policy "plans are visible"
on public.plans
for select
to anon, authenticated
using (active = true);

create policy "users read their own entitlement"
on public.entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users read their own redemptions"
on public.license_redemptions
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.plans from anon, authenticated;
revoke all on public.license_codes from anon, authenticated;
revoke all on public.entitlements from anon, authenticated;
revoke all on public.license_redemptions from anon, authenticated;

grant select on public.plans to anon, authenticated;
grant select on public.entitlements to authenticated;
grant select on public.license_redemptions to authenticated;

create or replace function public.redeem_license_code(redemption_code text)
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

  v_normalized_code := upper(regexp_replace(coalesce(redemption_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_normalized_code) < 8 then
    raise exception 'INVALID_CODE';
  end if;

  v_code_hash := encode(extensions.digest(convert_to(v_normalized_code, 'UTF8'), 'sha256'), 'hex');

  select c.id, c.plan_id, p.name, p.duration_days, c.expires_at
    into v_code_id, v_plan_id, v_plan_name, v_duration_days, v_code_expires_at
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

revoke all on function public.redeem_license_code(text) from public;
revoke all on function public.redeem_license_code(text) from anon;
grant execute on function public.redeem_license_code(text) to authenticated;

comment on table public.license_codes is
  'Códigos armazenados somente como SHA-256 normalizado. Nunca grave o código em texto puro.';
comment on function public.redeem_license_code(text) is
  'Resgata um código uma única vez e acumula sua duração sobre uma assinatura ainda ativa.';
