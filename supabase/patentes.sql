-- Patentes, hierarquia e acesso por patente da ROTA.
-- A patente vem da ficha do efetivo ligada à conta (police_users.roster_id); conta sem ficha conta como Recruta.
-- Cada área da área policial tem uma patente mínima, ajustável pelo comando no portal.
-- Pode ser executado de novo com segurança. Execute depois de tags.sql.

create table if not exists public.rota_ranks (
  rank text primary key,
  level integer not null unique
);
insert into public.rota_ranks (rank, level) values
  ('Recruta', 0), ('Soldado', 1), ('Cabo', 2), ('3º Sargento', 3), ('2º Sargento', 4), ('1º Sargento', 5), ('Subtenente', 6),
  ('Aspirante a Oficial', 7), ('2º Tenente', 8), ('1º Tenente', 9), ('Capitão', 10), ('Major', 11), ('Tenente-Coronel', 12), ('Coronel', 13),
  ('Sub Comandante', 14), ('Comandante Geral', 15)
on conflict (rank) do update set level = excluded.level;

create table if not exists public.rota_area_rules (
  area text primary key,
  min_rank text not null references public.rota_ranks(rank) on update cascade,
  updated_by text not null default 'sistema',
  updated_at timestamptz not null default now()
);
-- Padrões: Recruta só consulta; agir a partir de Soldado; Ouvidoria só para oficiais.
-- Regras já ajustadas pelo comando são mantidas.
insert into public.rota_area_rules (area, min_rank) values
  ('painel', 'Recruta'), ('codigo-penal', 'Recruta'), ('efetivo', 'Recruta'), ('blacklist', 'Recruta'), ('balanco', 'Recruta'),
  ('bo.ver', 'Recruta'), ('prisoes.ver', 'Recruta'), ('procurados.ver', 'Recruta'), ('operacoes.ver', 'Recruta'), ('registros.ver', 'Recruta'),
  ('bo.decidir', 'Soldado'), ('prisoes.registrar', 'Soldado'), ('procurados.cadastrar', 'Soldado'), ('operacoes.criar', 'Soldado'), ('registros.criar', 'Soldado'),
  ('ouvidoria.ver', 'Aspirante a Oficial'), ('ouvidoria.decidir', 'Aspirante a Oficial')
on conflict (area) do nothing;

alter table public.police_users add column if not exists suspended_until timestamptz;
alter table public.police_users add column if not exists suspension_reason text not null default '';
alter table public.police_users add column if not exists suspended_by text not null default '';

-- Poderes avulsos: dados a uma pessoa, fora das tags.
create table if not exists public.rota_user_permissions (
  user_id uuid not null references public.police_users(user_id) on delete cascade,
  permission text not null,
  granted_by text not null default '',
  granted_at timestamptz not null default now(),
  primary key (user_id, permission)
);

create table if not exists public.rota_rank_history (
  id bigint generated always as identity primary key,
  roster_id uuid references public.rota_roster(id) on delete set null,
  qra text not null default '',
  from_rank text not null default '',
  to_rank text not null,
  actor text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists rota_rank_history_created_idx on public.rota_rank_history (created_at desc);

-- O histórico de tags passa a registrar toda a hierarquia.
alter table public.rota_tag_log drop constraint if exists rota_tag_log_action_check;
alter table public.rota_tag_log add constraint rota_tag_log_action_check check (action in (
  'criar', 'editar', 'apagar', 'dar', 'tirar', 'vincular',
  'poder', 'tirar-poder', 'suspender', 'cancelar-suspensao', 'promover', 'rebaixar', 'regra'));

alter table public.rota_ranks enable row level security;
alter table public.rota_area_rules enable row level security;
alter table public.rota_user_permissions enable row level security;
alter table public.rota_rank_history enable row level security;
revoke all on public.rota_ranks from public, anon, authenticated;
revoke all on public.rota_area_rules from public, anon, authenticated;
revoke all on public.rota_user_permissions from public, anon, authenticated;
revoke all on public.rota_rank_history from public, anon, authenticated;
grant all on public.rota_ranks to service_role;
grant all on public.rota_area_rules to service_role;
grant all on public.rota_user_permissions to service_role;
grant all on public.rota_rank_history to service_role;

-- Nível da patente de uma conta (sem ficha ou patente desconhecida = Recruta).
create or replace function public.rota_user_level(uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select r.level from public.police_users p
    join public.rota_roster f on f.id = p.roster_id
    join public.rota_ranks r on r.rank = f.rank
    where p.user_id = uid), 0);
$$;

-- A conta logada pode usar a área? (habilitada, não suspensa e com patente suficiente)
create or replace function public.rota_can(area_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.police_users p
    where p.user_id = (select auth.uid()) and p.enabled = true
      and (p.suspended_until is null or p.suspended_until <= now()))
  and public.rota_user_level((select auth.uid())) >= coalesce((select r.level from public.rota_area_rules a
    join public.rota_ranks r on r.rank = a.min_rank where a.area = area_name), 0);
$$;
revoke all on function public.rota_user_level(uuid) from public, anon, authenticated;
revoke all on function public.rota_can(text) from public, anon;
grant execute on function public.rota_can(text) to authenticated;

-- Suspenso não conta como policial ativo.
create or replace function public.is_rota_police()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.police_users p where p.user_id = (select auth.uid()) and p.enabled = true
    and (p.suspended_until is null or p.suspended_until <= now()));
$$;

-- B.O. e Ouvidoria são lidos e decididos direto do navegador: a patente vale aqui também.
drop policy if exists "authorized police reads bo tickets" on public.bo_tickets;
create policy "authorized police reads bo tickets" on public.bo_tickets for select to authenticated
  using ((select public.rota_can('bo.ver')));
drop policy if exists "authorized police decides bo tickets" on public.bo_tickets;
create policy "authorized police decides bo tickets" on public.bo_tickets for update to authenticated
  using ((select public.rota_can('bo.decidir'))) with check ((select public.rota_can('bo.decidir')));
drop policy if exists "authorized police reads ouvidoria tickets" on public.ouvidoria_tickets;
create policy "authorized police reads ouvidoria tickets" on public.ouvidoria_tickets for select to authenticated
  using ((select public.rota_can('ouvidoria.ver')));
drop policy if exists "authorized police decides ouvidoria tickets" on public.ouvidoria_tickets;
create policy "authorized police decides ouvidoria tickets" on public.ouvidoria_tickets for update to authenticated
  using ((select public.rota_can('ouvidoria.decidir'))) with check ((select public.rota_can('ouvidoria.decidir')));

-- A tag Comando recebe os poderes novos.
update public.rota_tags set permissions = (select array_agg(distinct p) from unnest(permissions || array['integrantes.suspender', 'patentes.promover', 'regras.ajustar', 'registros.moderar']) p)
  where id = 'comando';
