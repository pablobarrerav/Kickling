-- Kickling · esquema para Supabase
-- Pégalo entero en: Supabase > SQL Editor > New query > Run.
-- Se puede ejecutar más de una vez sin problema.

-- 1) Tabla única de documentos (equipos, miembros, partidos simulados, chat, nombres)
create table if not exists public.docs (
  col        text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);
create index if not exists docs_chat_team_idx on public.docs ((data->>'team')) where col = 'chat';
create index if not exists docs_sims_day_idx  on public.docs ((data->>'day'))  where col = 'sims';

-- 2) Candados (para que solo un jugador calcule cada jornada simulada)
create table if not exists public.locks (
  id         text        primary key,
  holder     text        not null,
  expires_at timestamptz not null
);

-- 3) Seguridad (RLS): solo usuarios con sesión (anónima o no) pueden leer y escribir.
alter table public.docs  enable row level security;
alter table public.locks enable row level security;

drop policy if exists docs_select on public.docs;
drop policy if exists docs_insert on public.docs;
drop policy if exists docs_update on public.docs;
drop policy if exists docs_delete on public.docs;

create policy docs_select on public.docs for select to authenticated using (
  case col when 'saves' then id = auth.uid()::text when 'push' then id like auth.uid()::text || '%' else true end);

-- Cada jugador solo puede crear/borrar SU ficha de miembro y SUS reservas de nombre.
-- (Un capitán sí puede modificar la ficha de un miembro, p. ej. para echarlo del equipo.)
create policy docs_insert on public.docs for insert to authenticated with check (
  case col
    when 'members' then id like auth.uid()::text || '%'
    when 'names'   then coalesce(data->>'uid','') like auth.uid()::text || '%'
    when 'saves'   then id = auth.uid()::text
    when 'push'    then id like auth.uid()::text || '%'
    else true
  end);
create policy docs_update on public.docs for update to authenticated
  using (case col when 'saves' then id = auth.uid()::text when 'push' then id like auth.uid()::text || '%' else true end)
  with check (
  case col
    when 'names' then coalesce(data->>'uid','') like auth.uid()::text || '%'
    when 'saves' then id = auth.uid()::text
    when 'push' then id like auth.uid()::text || '%'
    else true
  end);
create policy docs_delete on public.docs for delete to authenticated using (
  case col
    when 'members' then id like auth.uid()::text || '%'
    when 'names'   then coalesce(data->>'uid','') like auth.uid()::text || '%'
    when 'saves'   then id = auth.uid()::text
    when 'push'    then id like auth.uid()::text || '%'
    else true
  end);

-- 4) Funciones que usa el juego
-- Mezcla recursiva de JSON (como "update" en la versión de Claude): los objetos se fusionan, el resto se reemplaza.
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb) returns jsonb
language plpgsql immutable as $$
declare k text; r jsonb;
begin
  if jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then
    r := a;
    for k in select jsonb_object_keys(b) loop
      if r ? k then r := jsonb_set(r, array[k], public.jsonb_deep_merge(r->k, b->k));
      else r := jsonb_set(r, array[k], b->k);
      end if;
    end loop;
    return r;
  end if;
  return b;
end $$;

create or replace function public.doc_update(p_col text, p_id text, p_patch jsonb) returns void
language plpgsql as $$
begin
  update public.docs set data = public.jsonb_deep_merge(data, p_patch), updated_at = now()
   where col = p_col and id = p_id;
  if not found then raise exception 'doc_not_found'; end if;
end $$;

create or replace function public.doc_lock(p_id text, p_holder text, p_ttl_ms integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  insert into public.locks(id, holder, expires_at)
  values (p_id, p_holder, now() + (p_ttl_ms || ' milliseconds')::interval)
  on conflict (id) do update set holder = excluded.holder, expires_at = excluded.expires_at
    where public.locks.expires_at < now() or public.locks.holder = excluded.holder
  returning true into ok;
  return coalesce(ok, false);
end $$;

revoke all on function public.doc_lock(text, text, integer) from public, anon;
grant execute on function public.doc_lock(text, text, integer) to authenticated;
grant execute on function public.doc_update(text, text, jsonb) to authenticated;
grant select, insert, update, delete on public.docs to authenticated;
