# Avisos al móvil del chat del equipo (push)

Cuando alguien escribe en el chat, a sus compañeros les llega una notificación al móvil aunque la app esté cerrada.
Solo funciona en la versión alojada (GitHub Pages), no en la de Claude. Hacen falta 4 pasos en tu Supabase, una sola vez.

## 1. Actualiza las reglas
Supabase > SQL Editor > pega todo `supabase.sql` (el nuevo) y pulsa Run. Es seguro repetirlo. Añade que cada jugador solo pueda ver y tocar su propia suscripción de avisos.

## 2. Crea la función `push`
Supabase > Edge Functions > Deploy a new function > Via Editor. Nómbrala exactamente `push` y pega el contenido de `push-server/index.ts`. Despliégala.

## 3. Guarda las claves
Edge Functions > Secrets (o Project Settings > Edge Functions) y añade:
- `VAPID_PUBLIC` = la clave pública (la que ya va dentro de `push.js`)
- `VAPID_PRIVATE` = la clave privada que te di en el chat. **Es secreta: no la subas a GitHub.**
- `PUSH_SECRET` = la contraseña interna del archivo de claves
- `VAPID_CONTACT` = tu correo (opcional)

## 4. Conecta el chat con la función
SQL Editor > abre `push-server/trigger.sql`, cambia `TU_PROYECTO` por el de tu proyecto y `TU_SECRETO` por el valor de `PUSH_SECRET` y pulsa Run.

## En el móvil
Ajustes > Avisos: activa y acepta el permiso. Hay que entrar al juego con el equipo ya creado (se vincula solo en unos 30 s).
**iPhone:** Safari > Compartir > "Añadir a pantalla de inicio" y abrir el juego desde ese icono; iOS no permite avisos desde una pestaña normal (necesita iOS 16.4 o superior).

La notificación dice "<nombre> ha escrito en el chat del equipo"; a propósito no incluye el texto.
