// Cloudflare Pages — modo avançado (_worker.js)
// Trata POST /inscrever (salva o lead no MailerLite) e passa todo o resto
// para os assets estáticos. Variáveis de ambiente (painel Cloudflare → Settings
// → Environment variables):
//   MAILERLITE_API_KEY  (secreta — token da API do MailerLite)
//   MAILERLITE_GROUP_ID (id do grupo onde os inscritos entram)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/inscrever") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "method" }, 405);
      }
      return handleInscrever(request, env);
    }
    // tudo o resto = arquivos estáticos da página
    return env.ASSETS.fetch(request);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleInscrever(request, env) {
  if (!env.MAILERLITE_API_KEY) return json({ ok: false, error: "config" }, 500);

  let data = {};
  try {
    data = await request.json();
  } catch (_) {}

  const email = String(data.email || "").trim();
  const nome = String(data.nome || "").trim();
  const whatsapp = String(data.whatsapp || "").trim();
  if (!email || email.indexOf("@") < 1) return json({ ok: false, error: "email" }, 400);

  const body = { email, fields: { name: nome, phone: whatsapp } };
  if (env.MAILERLITE_GROUP_ID) body.groups = [String(env.MAILERLITE_GROUP_ID)];

  let r;
  try {
    r = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return json({ ok: false, error: "network" }, 502);
  }

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return json({ ok: false, error: "mailerlite", status: r.status, detail: detail.slice(0, 300) }, 502);
  }

  return json({ ok: true });
}
