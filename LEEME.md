# Kickling · versión alojable

Esta carpeta es el juego completo, listo para ponerlo en internet con una dirección propia, sin depender de Claude.
Los equipos, la liga y el chat usan una base de datos gratuita de **Supabase**. Cada persona recibe una identidad
anónima automática (no hace falta registrarse).

## Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El juego entero. Es lo único que cambia cuando hay una versión nueva. |
| `config.js` | **Lo único que tienes que rellenar:** dirección y clave de tu Supabase. |
| `backend.js` | Conecta el juego con Supabase. No hay que tocarlo. |
| `supabase.sql` | Crea las tablas y la seguridad en Supabase. |
| `manifest.json`, `icon-*.png`, `icon.svg` | Permiten "instalar" el juego en la pantalla de inicio del móvil. |

## Paso 1 · Crear la base de datos (10 minutos)

1. Entra en <https://supabase.com>, crea una cuenta y pulsa **New project**. Ponle nombre (por ejemplo, Kickling),
   elige una contraseña para la base de datos (guárdala) y la región más cercana (por ejemplo, Frankfurt o París).
2. Cuando el proyecto esté listo, ve a **SQL Editor → New query**, pega **todo** el contenido de `supabase.sql`
   y pulsa **Run**. Debe decir "Success". Se puede ejecutar más de una vez sin problema.
3. Ve a **Authentication** (autenticación) → **Sign In / Providers** (en algunas versiones, "Providers") y activa
   **Allow anonymous sign-ins** (permitir inicios de sesión anónimos). Guarda.
4. Ve a **Project Settings → API**. Copia dos datos:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - la clave **anon public** (empieza por `eyJ...`)

   ⚠️ Usa solo la clave **anon**. La clave `service_role` es secreta y **nunca** debe ir en `config.js`.

Los nombres de los menús de Supabase pueden cambiar un poco con el tiempo, pero los conceptos son estos.

## Paso 2 · Poner tus datos en el juego

Abre `config.js` con cualquier editor de texto y rellena:

```js
window.KICKLING_CONFIG = {
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  anonKey: "eyJ...tu clave anon..."
};
```

Si lo dejas vacío, el juego funciona igual pero solo en modo individual (sin liga ni chat).

## Paso 3 · Subir el juego a internet

Cualquier alojamiento de archivos estáticos sirve. Los más sencillos y gratuitos:

- **Netlify Drop** (<https://app.netlify.com/drop>): arrastras la carpeta entera y te da una dirección al instante.
- **Cloudflare Pages** o **GitHub Pages**: subes la carpeta a un repositorio y lo activas.

Abre la dirección en el móvil y listo. Para probar la liga necesitas al menos dos dispositivos o navegadores distintos:
uno crea un equipo y el otro se une.

**Instalarlo como app (sin tienda):**
- iPhone: en Safari, botón Compartir → **Añadir a pantalla de inicio**.
- Android: en Chrome, menú ⋮ → **Instalar aplicación** / **Añadir a pantalla de inicio**.

## Cómo actualizar el juego

Cuando haya una versión nueva solo hay que sustituir `index.html` por el nuevo (mantén tu `config.js`).
Los jugadores la verán al recargar la página. Su progreso no se pierde.

## Cosas que conviene saber

- **Identidad por dispositivo.** Cada navegador tiene su propia identidad anónima. Si alguien borra los datos del
  navegador o cambia de móvil, pierde su sitio en el equipo (el progreso del jugador se puede llevar con
  Ajustes → "Copiar código", pero la pertenencia al equipo va ligada a la identidad). Para producción conviene añadir
  inicio de sesión con correo o Apple/Google.
- **Seguridad básica, no a prueba de tramposos.** Las reglas de `supabase.sql` impiden que alguien se haga pasar por otro
  jugador o reserve su nombre, pero el juego calcula los partidos en el propio dispositivo, así que un jugador técnico
  podría manipular datos de su equipo. Es aceptable para pruebas con amigos; para un lanzamiento público habría
  que mover esos cálculos al servidor.
- **Límite de altas anónimas.** Supabase limita las altas anónimas por dirección IP (por defecto unas 30 por hora). Si
  muchas personas prueban a la vez desde la misma wifi, algunas pueden tardar en entrar.
- **Plan gratuito.** Supabase pausa los proyectos gratuitos tras una semana sin actividad (se reactivan desde su panel).
- **Avisos del sistema** (energía llena, entrenamiento terminado, partido jugado) solo funcionan con el juego abierto.
  Con la app cerrada harían falta notificaciones push, que requieren un servidor propio.

## Siguiente paso: App Store

Con esta versión ya puedes hacer pruebas reales. Para la App Store se envolvería esta misma carpeta con Capacitor
(proyecto de iOS), añadiendo inicio de sesión real, moderación del chat (denunciar y bloquear), política de privacidad
y notificaciones push. Hace falta un Mac con Xcode 26 o un servicio de compilación en la nube, y la cuenta de
desarrollador de Apple.

## Si el juego dice "La liga de equipos necesita conexión a internet"
Sube también `diagnostico.html` al repositorio, junto a `index.html`, y abre
`https://TU-USUARIO.github.io/TU-REPO/diagnostico.html`. Comprueba paso a paso
la configuración, la clave, el acceso anónimo, la tabla y la escritura, y te dice qué falla.
