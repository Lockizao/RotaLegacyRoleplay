-- Recepção da delegacia: sala de espera, fila por ordem de chegada e liberação de acesso.
-- Execute depois de schema.sql, roster-shared-login.sql, tags.sql e patentes.sql. Pode ser executado de novo.
--
-- Categorias de conta (police_users.role):
--   visitante  cidadão com conta: vê só o portal público
--   policial   integrante da ROTA (precisa de ficha do efetivo vinculada; a patente vem da ficha)
--   advogado, imprensa  previstos para o futuro, ainda sem telas nem acessos
--
-- ATENÇÃO: contas policiais sem ficha do efetivo vinculada viram visitante.
-- Vincule as contas que devem continuar policiais ANTES de executar.

alter table public.police_users drop constraint if exists police_users_role_check;
alter table public.police_users add constraint police_users_role_check
  check (role in ('policial', 'visitante', 'advogado', 'imprensa', 'admin'));
alter table public.police_users add column if not exists last_seen_at timestamptz;
update public.police_users set role = 'visitante' where role = 'policial' and roster_id is null;

-- Pedidos de acesso viram a fila da recepção.
alter table public.access_requests drop constraint if exists access_requests_status_check;
alter table public.access_requests add constraint access_requests_status_check
  check (status in ('Pendente', 'Em atendimento', 'Aprovado', 'Recusado', 'Desistiu'));
alter table public.access_requests add column if not exists passport text not null default '';
alter table public.access_requests add column if not exists purpose text not null default 'visitar';
alter table public.access_requests drop constraint if exists access_requests_purpose_check;
alter table public.access_requests add constraint access_requests_purpose_check check (purpose in ('visitar', 'ingressar'));
alter table public.access_requests add column if not exists note text not null default '';
alter table public.access_requests add column if not exists ticket_hash text;
alter table public.access_requests add column if not exists last_seen_at timestamptz;
alter table public.access_requests add column if not exists claimed_by uuid;
alter table public.access_requests add column if not exists claimed_name text not null default '';
alter table public.access_requests add column if not exists claimed_at timestamptz;
alter table public.access_requests add column if not exists decided_by text not null default '';
alter table public.access_requests add column if not exists granted_role text;
alter table public.access_requests add column if not exists granted_rank text;
alter table public.access_requests add column if not exists refusal_reason text not null default '';
alter table public.access_requests add column if not exists user_id uuid;
alter table public.access_requests add column if not exists picked_up_at timestamptz;
create unique index if not exists access_requests_ticket_uidx on public.access_requests (ticket_hash) where ticket_hash is not null;

-- Um pedido aberto (aguardando ou em atendimento) por nome.
drop index if exists public.access_requests_one_pending_per_type_uidx;
create unique index if not exists access_requests_one_open_per_type_uidx
  on public.access_requests (normalized_name, request_type) where status in ('Pendente', 'Em atendimento');
create index if not exists access_requests_queue_idx on public.access_requests (created_at) where status in ('Pendente', 'Em atendimento');

-- Histórico: atendimentos da recepção.
alter table public.rota_tag_log drop constraint if exists rota_tag_log_action_check;
alter table public.rota_tag_log add constraint rota_tag_log_action_check check (action in (
  'criar', 'editar', 'apagar', 'dar', 'tirar', 'vincular',
  'poder', 'tirar-poder', 'suspender', 'cancelar-suspensao', 'promover', 'rebaixar', 'regra',
  'recepcao-atender', 'recepcao-aprovar', 'recepcao-recusar'));

-- Só integrante (policial com ficha) conta como policial no banco; visitante não lê nada interno.
create or replace function public.rota_can(area_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.police_users p
    where p.user_id = (select auth.uid()) and p.enabled = true and p.role = 'policial' and p.roster_id is not null
      and (p.suspended_until is null or p.suspended_until <= now()))
  and public.rota_user_level((select auth.uid())) >= coalesce((select r.level from public.rota_area_rules a
    join public.rota_ranks r on r.rank = a.min_rank where a.area = area_name), 0);
$$;
revoke all on function public.rota_can(text) from public, anon;
grant execute on function public.rota_can(text) to authenticated;

create or replace function public.is_rota_police()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.police_users p where p.user_id = (select auth.uid()) and p.enabled = true
    and p.role = 'policial' and p.roster_id is not null
    and (p.suspended_until is null or p.suspended_until <= now()));
$$;
revoke all on function public.is_rota_police() from public, anon;
grant execute on function public.is_rota_police() to authenticated;
