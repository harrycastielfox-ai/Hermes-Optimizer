create table if not exists public.license_admin_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) <= 120),
  actor_email text not null check (
    actor_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  key_hash text not null unique check (key_hash ~ '^[a-f0-9]{64}$'),
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists license_admin_keys_active_idx
on public.license_admin_keys(active);

alter table public.license_admin_keys enable row level security;

revoke all on public.license_admin_keys from anon, authenticated;

comment on table public.license_admin_keys is
  'Hashes das chaves administrativas do painel NEX. Nunca armazena chave em texto puro.';
