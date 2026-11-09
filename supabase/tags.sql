-- Tags e permissões da equipe ROTA.
-- Cada tag reúne permissões (ex.: publicar comunicados); um integrante pode ter várias tags.
-- A conta policial passa a apontar para a ficha do efetivo (QRA, passaporte, patente).
-- Pode ser executado de novo com segurança. Execute depois de schema.sql e roster-shared-login.sql.

alter table public.police_users add column if not exists roster_id uuid references public.rota_roster(id) on delete set null;
create unique index if not exists police_users_roster_uidx on public.police_users (roster_id) where roster_id is not null;

create table if not exists public.rota_tags (
  id text primary key,
  name text not null,
  description text not null default '',
  permissions text[] not null default '{}',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rota_tags_id_format check (id ~ '^[a-z0-9-]{2,40}$'),
  constraint rota_tags_name_length check (length(trim(name)) between 2 and 40),
  constraint rota_tags_description_length check (length(description) <= 200)
);
create unique index if not exists rota_tags_name_uidx on public.rota_tags (lower(name));

create table if not exists public.rota_user_tags (
  user_id uuid not null references public.police_users(user_id) on delete cascade,
  tag_id text not null references public.rota_tags(id) on delete cascade,
  granted_by text not null default '',
  granted_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);
create index if not exists rota_user_tags_tag_idx on public.rota_user_tags (tag_id);

-- Histórico de quem criou, alterou, deu ou tirou cada tag.
create table if not exists public.rota_tag_log (
  id bigint generated always as identity primary key,
  action text not null check (action in ('criar', 'editar', 'apagar', 'dar', 'tirar', 'vincular')),
  actor text not null,
  tag_id text,
  tag_name text,
  target_user uuid,
  target_name text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists rota_tag_log_created_idx on public.rota_tag_log (created_at desc);

alter table public.rota_tags enable row level security;
alter table public.rota_user_tags enable row level security;
alter table public.rota_tag_log enable row level security;
revoke all on public.rota_tags from public, anon, authenticated;
revoke all on public.rota_user_tags from public, anon, authenticated;
revoke all on public.rota_tag_log from public, anon, authenticated;
grant all on public.rota_tags to service_role;
grant all on public.rota_user_tags to service_role;
grant all on public.rota_tag_log to service_role;

-- Tags iniciais. Só são criadas se ainda não existirem; edições feitas no portal são mantidas.
insert into public.rota_tags (id, name, description, permissions, created_by) values
  ('comando', 'Comando', 'Comando da unidade: cria e distribui tags, aprova acessos e cuida do efetivo, comunicados, editais e blacklist.',
    array['tags.gerenciar', 'acessos.gerenciar', 'efetivo.gerenciar', 'comunicados.publicar', 'editais.gerenciar', 'blacklist.gerenciar'], 'sistema'),
  ('recrutador', 'Recrutador', 'Publica editais e analisa as candidaturas.', array['editais.gerenciar'], 'sistema'),
  ('corregedoria', 'Corregedoria', 'Inclui e remove personagens da blacklist.', array['blacklist.gerenciar'], 'sistema')
on conflict (id) do nothing;
