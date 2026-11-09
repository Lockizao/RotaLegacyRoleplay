-- Identidade dos integrantes: foto da conta e cores do nome por segmento (tags), com gancho para cores por patente.
-- Execute depois de integrantes.sql. Pode ser executado de novo.

-- Foto do personagem (vazio = logo da ROTA).
alter table public.police_users add column if not exists photo_path text not null default '';
alter table public.police_users add column if not exists photo_url text not null default '';

-- Foto enviada junto com o pedido na recepção (passa para a conta na aprovação).
alter table public.access_requests add column if not exists photo_path text not null default '';
alter table public.access_requests add column if not exists photo_url text not null default '';

-- Configuração central das cores do nome: segmento = tag. Menor prioridade vence quando há várias.
alter table public.rota_tags add column if not exists name_color text;
alter table public.rota_tags add column if not exists color_priority integer;
alter table public.rota_tags drop constraint if exists rota_tags_name_color_hex;
alter table public.rota_tags add constraint rota_tags_name_color_hex check (name_color is null or name_color ~ '^#[0-9A-Fa-f]{6}$');
update public.rota_tags set name_color = coalesce(name_color, '#4AA8E8'), color_priority = coalesce(color_priority, 1) where id = 'comando';
update public.rota_tags set name_color = coalesce(name_color, '#F1C40F'), color_priority = coalesce(color_priority, 2) where id = 'corregedoria';
update public.rota_tags set name_color = coalesce(name_color, '#EC7063'), color_priority = coalesce(color_priority, 3) where id = 'recrutador';

-- Tons legíveis no fundo escuro (contraste AA): azul e vermelho um pouco mais claros que #3498DB e #E74C3C.
update public.rota_tags set name_color = '#4AA8E8' where id = 'comando' and name_color = '#3498DB';
update public.rota_tags set name_color = '#EC7063' where id = 'recrutador' and name_color = '#E74C3C';

-- Gancho para o futuro: cor do nome por patente (sem uso nesta etapa).
alter table public.rota_ranks add column if not exists name_color text;

-- Fotos dos personagens: leitura pública; o envio é feito só pelo servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rota-avatars', 'rota-avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = excluded.allowed_mime_types;
