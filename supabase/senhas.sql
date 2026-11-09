-- Senha própria, sessões revogáveis e idade na recepção.
-- Execute depois de recepcao.sql. Pode ser executado de novo.

-- Toda conta cria a própria senha no primeiro login com o token (o token vira só recuperação).
alter table public.police_users add column if not exists must_set_password boolean not null default true;

-- Idade real informada na recepção (mínimo 15; 15 e 16 exigem verificação de quem atende).
alter table public.access_requests add column if not exists age integer;
alter table public.access_requests drop constraint if exists access_requests_age_check;
alter table public.access_requests add constraint access_requests_age_check check (age is null or age between 15 and 99);
alter table public.access_requests add column if not exists age_checked_by text not null default '';

-- Derruba todas as sessões de uma conta (troca de token, suspensão, desativação).
create or replace function public.rota_revoke_sessions(uid uuid)
returns void language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = uid;
$$;
revoke all on function public.rota_revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.rota_revoke_sessions(uuid) to service_role;
