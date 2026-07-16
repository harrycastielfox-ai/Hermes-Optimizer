create table public.license_admins (
  email text primary key check (
    email = lower(trim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.license_admins enable row level security;
revoke all on public.license_admins from anon, authenticated;

comment on table public.license_admins is
  'Allowlist administrativa do licenciamento. Acesso exclusivo do backend com secret key.';
