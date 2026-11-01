-- Quadros compartilhados da área policial: Operações, Registros RP e Procurados RP.
-- Execute no Supabase > SQL Editor. É seguro executar novamente.
-- O acesso é feito pela API do portal (/api/board) com a chave do servidor;
-- o navegador nunca lê ou grava esta tabela diretamente.

create extension if not exists pgcrypto;

create table if not exists public.police_board_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ops', 'inc', 'wanted')),
  title text not null,
  zone text not null default '',
  leader text not null default '',
  status text not null default '',
  person text not null default '',
  place text not null default '',
  detail text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true,
  removed_by uuid references auth.users(id) on delete set null,
  removed_at timestamptz,
  constraint police_board_title_length check (length(trim(title)) between 2 and 120),
  constraint police_board_text_length check (length(zone) <= 120 and length(leader) <= 120 and length(person) <= 120 and length(place) <= 120 and length(detail) <= 2000),
  constraint police_board_ops_status check (kind <> 'ops' or status in ('Programada', 'Em andamento', 'Concluída'))
);

create index if not exists police_board_active_kind_idx
  on public.police_board_entries (kind, created_at desc) where is_active = true;

alter table public.police_board_entries enable row level security;
revoke all on public.police_board_entries from public, anon, authenticated;
grant all on public.police_board_entries to service_role;
