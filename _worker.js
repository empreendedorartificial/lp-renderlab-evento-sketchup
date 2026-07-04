// Cloudflare Pages — modo avançado (_worker.js)
// POST /inscrever: salva o lead no MailerLite (e-mail) e no ManyChat (WhatsApp,
// dispara template via API oficial). Todo o resto = assets estáticos.
//
// Variáveis de ambiente (painel Cloudflare → Settings → Environment variables):
//   MAILERLITE_API_KEY   (secreta — token da API do MailerLite)
//   MAILERLITE_GROUP_ID  (id do grupo onde os inscritos entram)
//   MANYCHAT_API_TOKEN   (secreta — token da API do ManyChat)
//   MANYCHAT_FLOW_NS     (namespace do fluxo do ManyChat que envia o template de boas-vindas/lembrete)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/inscrever") {
      if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);
      return handleInscrever(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

// "(44) 99723-4024" -> "5544997234024" (E.164 sem +)
function normPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length >= 12 && d.slice(0, 2) === "55") return d; // já tem DDI 55
  if (d.length === 10 || d.length === 11) return "55" + d; // DDD + número
  return d;
}

async function handleInscrever(request, env) {
  let data = {};
  try { data = await request.json(); } catch (_) {}

  const email = String(data.email || "").trim();
  const nome = String(data.nome || "").trim();
  const phone = normPhone(data.whatsapp);
  if (!email || email.indexOf("@") < 1) return json({ ok: false, error: "email" }, 400);

  // Origem do lead (UTMs capturados pela página) -> string compacta pro MailerLite
  const u = (data.utm && typeof data.utm === "object") ? data.utm : {};
  const lim = (v) => String(v || "").slice(0, 100);
  const origem = [lim(u.utm_campaign), lim(u.utm_content), lim(u.utm_term)].filter(Boolean).join(" | ").slice(0, 250)
    || lim(u.src) || lim(u.utm_source) || "";

  // 1) MailerLite (e-mail) — precisa dar certo
  const ml = await mailerlite(env, { email, nome, phone, origem });
  if (!ml.ok) return json({ ok: false, error: "mailerlite", detail: ml.detail }, 502);

  // 2) ManyChat (WhatsApp) — best-effort; não derruba a inscrição se falhar
  const mc = await manychat(env, { phone, nome });

  return json({ ok: true, mailerlite: true, whatsapp: mc.ok });
}

// Garante que o campo custom "origem" existe na conta (cache no isolate; criar é idempotente).
let ORIGEM_FIELD_OK = false;
async function mlGarantirCampoOrigem(env) {
  if (ORIGEM_FIELD_OK) return;
  const h = { Authorization: `Bearer ${env.MAILERLITE_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" };
  try {
    const r = await fetch("https://connect.mailerlite.com/api/fields?filter[keyword]=origem", { headers: h });
    const d = await r.json().catch(() => ({}));
    if (!(d.data || []).some((f) => f.key === "origem" || f.name === "origem")) {
      await fetch("https://connect.mailerlite.com/api/fields", { method: "POST", headers: h, body: JSON.stringify({ name: "origem", type: "text" }) });
    }
    ORIGEM_FIELD_OK = true;
  } catch (_) {}
}

async function mailerlite(env, { email, nome, phone, origem }) {
  if (!env.MAILERLITE_API_KEY) return { ok: false, detail: "sem MAILERLITE_API_KEY" };
  const fields = { name: nome, phone };
  if (origem) { await mlGarantirCampoOrigem(env); fields.origem = origem; }
  const body = { email, fields };
  if (env.MAILERLITE_GROUP_ID) body.groups = [String(env.MAILERLITE_GROUP_ID)];
  try {
    const r = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, detail: (await r.text().catch(() => "")).slice(0, 200) };
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: "network" };
  }
}

async function manychat(env, { phone, nome }) {
  if (!env.MANYCHAT_API_TOKEN || !phone) return { ok: false, skipped: true };
  const headers = {
    Authorization: `Bearer ${env.MANYCHAT_API_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  try {
    // cria/atualiza assinante de WhatsApp
    const cr = await fetch("https://api.manychat.com/fb/subscriber/createSubscriber", {
      method: "POST",
      headers,
      body: JSON.stringify({ whatsapp_phone: phone, first_name: nome || undefined }),
    });
    const cj = await cr.json().catch(() => ({}));
    const sid = cj && cj.data && cj.data.id;
    if (!sid) return { ok: false, step: "create", detail: JSON.stringify(cj).slice(0, 200) };

    // dispara o fluxo (template) — fora da janela de 24h via API oficial
    if (env.MANYCHAT_FLOW_NS) {
      const fr = await fetch("https://api.manychat.com/fb/sending/sendFlow", {
        method: "POST",
        headers,
        body: JSON.stringify({ subscriber_id: sid, flow_ns: env.MANYCHAT_FLOW_NS }),
      });
      const fj = await fr.json().catch(() => ({}));
      return { ok: fr.ok && fj && fj.status === "success", sid };
    }
    return { ok: true, sid, note: "sem MANYCHAT_FLOW_NS" };
  } catch (e) {
    return { ok: false, detail: "network" };
  }
}
