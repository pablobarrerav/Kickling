-- Kickling · aviso push: dispara la función "push" cada vez que se crea un mensaje de chat.
-- Antes de ejecutarlo cambia TU_PROYECTO por el identificador de tu proyecto (la parte de https://TU_PROYECTO.supabase.co)
-- y TU_ANON_KEY por la clave "anon public" (la misma de config.js).
create extension if not exists pg_net with schema extensions;

create or replace function public.kickling_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://TU_PROYECTO.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer TU_ANON_KEY'),
    body := jsonb_build_object('record', jsonb_build_object('col', new.col, 'id', new.id, 'data', new.data)));
  return new;
end $$;

drop trigger if exists kickling_push_trg on public.docs;
create trigger kickling_push_trg after insert on public.docs
  for each row when (new.col = 'chat') execute function public.kickling_push();
