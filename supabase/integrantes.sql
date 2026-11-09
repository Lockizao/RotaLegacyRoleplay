-- Login por ID no servidor, remoção de integrantes, Blacklist que bloqueia acesso e auditoria permanente.
-- Execute depois de senhas.sql. Pode ser executado de novo.

-- ID no servidor (passaporte) como credencial; único entre contas que não foram removidas.
alter table public.police_users add column if not exists login_id text;
alter table public.police_users drop constraint if exists police_users_login_id_digits;
alter table public.police_users add constraint police_users_login_id_digits check (login_id is null or login_id ~ '^[0-9]{1,10}$');
alter table public.police_users add column if not exists removed_at timestamptz;
alter table public.police_users add column if not exists removed_by text not null default '';
alter table public.police_users add column if not exists removal_kind text not null default '';
alter table public.police_users add column if not exists removal_reason text not null default '';
create unique index if not exists police_users_login_id_active_uidx on public.police_users (login_id) where login_id is not null and removed_at is null;

-- Preenche o ID de quem já dá para saber (ficha do efetivo; depois pedido aprovado na recepção), sem colidir.
with candidates as (
  select p.user_id, f.passport as login_id
  from public.police_users p join public.rota_roster f on f.id = p.roster_id
  where p.login_id is null and p.removed_at is null and f.passport ~ '^[0-9]{1,10}$'
  union all
  select distinct on (r.user_id) r.user_id, r.passport
  from public.access_requests r join public.police_users p on p.user_id = r.user_id
  where p.login_id is null and p.removed_at is null and r.status = 'Aprovado' and r.passport ~ '^[0-9]{1,10}$'
),
first_choice as (
  select distinct on (user_id) user_id, login_id from candidates order by user_id
),
unique_choice as (
  select c.* from first_choice c
  where (select count(*) from first_choice o where o.login_id = c.login_id) = 1
    and not exists (select 1 from public.police_users u where u.login_id = c.login_id and u.removed_at is null)
)
update public.police_users p set login_id = u.login_id from unique_choice u where p.user_id = u.user_id;

-- Blacklist: passa a bloquear pelo ID e guarda quem incluiu/retirou e por quê.
alter table public.rota_blacklist add column if not exists user_id uuid;
alter table public.rota_blacklist add column if not exists created_by_name text not null default '';
alter table public.rota_blacklist add column if not exists created_by_login text not null default '';
alter table public.rota_blacklist add column if not exists removal_reason text not null default '';
alter table public.rota_blacklist add column if not exists removed_by_name text not null default '';
create unique index if not exists rota_blacklist_active_player_uidx on public.rota_blacklist (player_id) where is_active = true;

-- Auditoria permanente: só inserção (nem o servidor altera ou apaga).
create table if not exists public.rota_audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  result text not null check (result in ('concluida', 'negada')),
  target_user uuid,
  target_login_id text not null default '',
  target_name text not null default '',
  reason text not null default '',
  actor_login_id text not null default '',
  actor_name text not null default '',
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists rota_audit_log_created_idx on public.rota_audit_log (created_at desc);
create or replace function public.rota_audit_log_readonly()
returns trigger language plpgsql as $$
begin
  raise exception 'O registro de auditoria não pode ser alterado nem apagado.';
end;
$$;
drop trigger if exists rota_audit_log_no_change on public.rota_audit_log;
create trigger rota_audit_log_no_change before update or delete on public.rota_audit_log
  for each row execute function public.rota_audit_log_readonly();
alter table public.rota_audit_log enable row level security;
revoke all on public.rota_audit_log from public, anon, authenticated;
grant select, insert on public.rota_audit_log to service_role;
grant usage, select on sequence public.rota_audit_log_id_seq to service_role;

-- Tentativas de login e de reautenticação (limite contra força bruta). A chave é um hash, nunca o IP em claro.
create table if not exists public.rota_auth_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  kind text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists rota_auth_attempts_recent_idx on public.rota_auth_attempts (attempted_at desc, key);
alter table public.rota_auth_attempts enable row level security;
revoke all on public.rota_auth_attempts from public, anon, authenticated;
grant all on public.rota_auth_attempts to service_role;

-- A tag Comando recebe o poder de remover integrantes.
update public.rota_tags set permissions = (select array_agg(distinct p) from unnest(permissions || array['integrantes.remover']) p)
  where id = 'comando';

-- Removido não conta como policial no banco.
create or replace function public.is_rota_police()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.police_users p where p.user_id = (select auth.uid()) and p.enabled = true
    and p.removed_at is null and p.role = 'policial' and p.roster_id is not null
    and (p.suspended_until is null or p.suspended_until <= now()));
$$;
revoke all on function public.is_rota_police() from public, anon;
grant execute on function public.is_rota_police() to authenticated;
