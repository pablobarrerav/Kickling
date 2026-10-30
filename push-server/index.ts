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
    // Solo la base de datos de Kickling conoce este secreto; así nadie de fuera puede disparar avisos falsos.
    if (req.headers.get("x-kickling") !== Deno.env.get("PUSH_SECRET")) return new Response("no autorizado", { status: 401 });
    const p = await req.json();
    const r = p.record;
    if (!r || r.col !== "chat" || !r.data || r.data.sys || !r.data.team) return new Response("ignorado");
    const team = String(r.data.team), from = String(r.data.uid || "");
    const { data: subs } = await sb.from("docs").select("id,data").eq("col", "push").eq("data->>team", team);
    let tn = "tu equipo";
    const t = await sb.from("docs").select("data").eq("col", "teams").eq("id", team).maybeSingle();
    if (t.data && t.data.data && t.data.data.name) tn = String(t.data.data.name).slice(0, 30);
    // Sin el texto del mensaje a propósito: así nunca sale en la pantalla de bloqueo algo que el filtro del chat ocultaría.
    const isMail = r.data.kind === "mail";
    const norm = (x: unknown) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9@]/g, "");
    let targets = (subs || []).filter((s) => s.data && s.data.uid !== from && s.data.sub);
    let msg: string;
    if (isMail) {
      // Mensaje del capitán al buzón: le llega a todo el equipo.
      msg = JSON.stringify({ title: "Buzón de " + tn, body: "Tu capitán te ha enviado un mensaje.", tag: "kickling-ml" });
    } else {
      // Chat: solo avisa a quien es mencionado con @nombre (sin tildes ni mayúsculas ni espacios).
      const text = norm(r.data.text);
      if (text.indexOf("@") < 0) return new Response("sin menciones");
      const ids = targets.map((s) => String(s.data.uid));
      const { data: mem } = await sb.from("docs").select("id,data").eq("col", "members").in("id", ids);
      const names: Record<string, string> = {};
      (mem || []).forEach((m) => { names[m.id] = norm(m.data && m.data.name); });
      targets = targets.filter((s) => { const nm = names[String(s.data.uid)]; return nm && nm.length >= 2 && text.indexOf("@" + nm) >= 0; });
      if (!targets.length) return new Response("sin menciones");
      // Sin el texto del mensaje a propósito: así nunca sale en la pantalla de bloqueo algo que el filtro del chat ocultaría.
      msg = JSON.stringify({ title: "Chat de " + tn, body: String(r.data.name || "Un compañero").slice(0, 16) + " te ha mencionado en el chat del equipo", tag: "kickling-chat-" + team });
    }
    let n = 0;
    await Promise.all(targets.map(async (s) => {
      try { await webpush.sendNotification(s.data.sub, msg, { TTL: 3600 }); n++; }
      catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from("docs").delete().eq("col", "push").eq("id", s.id); }
    }));
    return new Response("enviados " + n);
  } catch (e) { return new Response("error " + e, { status: 200 }); }
});
