// Kickling · función "push": envía un aviso al móvil de tus compañeros cuando alguien escribe en el chat del equipo.
// Se ejecuta sola cuando se inserta un mensaje en la tabla docs (ver LEEME-PUSH.md).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const PUB = Deno.env.get("VAPID_PUBLIC")!;
const PRIV = Deno.env.get("VAPID_PRIVATE")!;
webpush.setVapidDetails("mailto:" + (Deno.env.get("VAPID_CONTACT") || "kickling@example.com"), PUB, PRIV);
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  try {
    const p = await req.json();
    const r = p.record;
    if (!r || r.col !== "chat" || !r.data || r.data.sys || !r.data.team) return new Response("ignorado");
    const team = String(r.data.team), from = String(r.data.uid || "");
    const { data: subs } = await sb.from("docs").select("id,data").eq("col", "push").eq("data->>team", team);
    let tn = "tu equipo";
    const t = await sb.from("docs").select("data").eq("col", "teams").eq("id", team).maybeSingle();
    if (t.data && t.data.data && t.data.data.name) tn = String(t.data.data.name).slice(0, 30);
    // Sin el texto del mensaje a propósito: así nunca sale en la pantalla de bloqueo algo que el filtro del chat ocultaría.
    const msg = JSON.stringify({ title: "Chat de " + tn, body: String(r.data.name || "Un compañero").slice(0, 16) + " ha escrito en el chat del equipo", tag: "kickling-chat-" + team });
    let n = 0;
    await Promise.all((subs || []).filter((s) => s.data && s.data.uid !== from && s.data.sub).map(async (s) => {
      try { await webpush.sendNotification(s.data.sub, msg, { TTL: 3600 }); n++; }
      catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from("docs").delete().eq("col", "push").eq("id", s.id); }
    }));
    return new Response("enviados " + n);
  } catch (e) { return new Response("error " + e, { status: 200 }); }
});
