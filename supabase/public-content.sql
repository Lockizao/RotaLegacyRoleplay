-- Comunicados e editais publicados pela administração do portal.
-- Execute no Supabase > SQL Editor. É seguro executar novamente.
-- Leitura e gravação passam pela API do portal (/api/content) com a chave do servidor;
-- somente a sessão de administrador publica ou remove conteúdo.

create extension if not exists pgcrypto;

create table if not exists public.rota_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  removed_at timestamptz,
  constraint rota_announcements_title_length check (length(trim(title)) between 3 and 120),
  constraint rota_announcements_detail_length check (length(trim(detail)) between 3 and 2000)
);
create index if not exists rota_announcements_active_idx
  on public.rota_announcements (created_at desc) where is_active = true;

-- O id é texto porque as candidaturas (edital_applications.edital_id) guardam o id do edital como texto.
create table if not exists public.rota_editais (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  summary text not null default '',
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  removed_at timestamptz,
  constraint rota_editais_id_format check (id ~ '^[a-z0-9-]{1,100}$'),
  constraint rota_editais_title_length check (length(trim(title)) between 3 and 160),
  constraint rota_editais_summary_length check (length(summary) <= 1000),
  constraint rota_editais_period check (closes_at > opens_at)
);
create index if not exists rota_editais_active_idx
  on public.rota_editais (closes_at desc) where is_active = true;

alter table public.rota_announcements enable row level security;
alter table public.rota_editais enable row level security;
revoke all on public.rota_announcements from public, anon, authenticated;
revoke all on public.rota_editais from public, anon, authenticated;
grant all on public.rota_announcements to service_role;
grant all on public.rota_editais to service_role;
