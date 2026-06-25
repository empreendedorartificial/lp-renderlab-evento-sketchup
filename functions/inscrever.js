// Cloudflare Pages Function — POST /inscrever
// Salva o lead no MailerLite. A chave e o grupo vêm de variáveis de ambiente
// definidas no painel da Cloudflare (Settings → Environment variables):
//   MAILERLITE_API_KEY  (secreta — token da API do MailerLite)
//   MAILERLITE_GROUP_ID (id do grupo/lista onde os inscritos entram)
// Assim a chave NUNCA fica exposta no código/repositório.

export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json" },
    });

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

  // 200/201 = ok (cria ou atualiza o inscrito)
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return json({ ok: false, error: "mailerlite", status: r.status, detail: detail.slice(0, 300) }, 502);
  }

  return json({ ok: true });
}
