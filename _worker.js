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

  // 1) MailerLite (e-mail) — precisa dar certo
  const ml = await mailerlite(env, { email, nome, phone });
  if (!ml.ok) return json({ ok: false, error: "mailerlite", detail: ml.detail }, 502);

  // 2) ManyChat (WhatsApp) — best-effort; não derruba a inscrição se falhar
  const mc = await manychat(env, { phone, nome });

  return json({ ok: true, mailerlite: true, whatsapp: mc.ok });
}

async function mailerlite(env, { email, nome, phone }) {
  if (!env.MAILERLITE_API_KEY) return { ok: false, detail: "sem MAILERLITE_API_KEY" };
  const body = { email, fields: { name: nome, phone } };
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
