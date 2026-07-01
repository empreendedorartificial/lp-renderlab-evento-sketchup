# LP — Live de lançamento: IA dentro do SketchUp (RenderLAB)

Página de captação da live de lançamento da funcionalidade **IA dentro do SketchUp** usando o RenderLAB.

## Deploy

**Domínio:** https://iasketchup.montani3d.com.br/
**Repo:** https://github.com/empreendedorartificial/lp-renderlab-evento-sketchup

Projeto **Cloudflare Workers (Static Assets)** — deploy command `npx wrangler deploy`. Config em `wrangler.toml` (`main = "_worker.js"`, `assets.directory = "./public"`). Alteração → `git commit` + `git push` → deploy automático em ~30s.

> Migrada da Vercel (preview temporário) para git + Cloudflare em jun/2026.

### Variáveis de ambiente (painel Cloudflare → Settings → Environment variables)

| Variável | O que é |
|---|---|
| `MAILERLITE_API_KEY` | Token da API do MailerLite (secreta) |
| `MAILERLITE_GROUP_ID` | Id do grupo onde os inscritos entram |
| `MANYCHAT_API_TOKEN` | Token da API do ManyChat (secreta) |
| `MANYCHAT_FLOW_NS` | Namespace do fluxo do ManyChat que envia o template de WhatsApp |

O formulário faz `POST /inscrever` → o worker (`_worker.js`) salva no MailerLite **e** cria o assinante no ManyChat disparando o fluxo (template via API oficial, fora da janela de 24h). Sem as variáveis, o endpoint responde `{ok:false,error:"config"}`.

## Stack

- HTML único com CSS e JS inline (~60KB)
- Fundo animado em `<canvas>` (flow field), galeria imersiva no hero
- Vídeo sizzle (sizzle-hd3.mp4) produzido no Remotion — fonte em `../_renderlab-sizzle-remotion/`
- Vídeos comprimidos < 25 MB cada (limite de arquivo do Cloudflare Pages)
- Zero dependências externas

## Estrutura

```
_worker.js                  — POST /inscrever (MailerLite + ManyChat) + serve os estáticos
wrangler.toml               — config do Worker (main + assets.directory=./public)
public/                     — tudo que a Cloudflare serve como estático
  index.html                — página completa
  assets/
    video/                  — sizzle-hd3.mp4 (principal), feat-*.mp4 (funcionalidades),
                              hero-clip-a/b.mp4 (galeria do hero), renderlab1.mp4 (vertical)
    img/
      renders/              — renders limpos (galeria e personas)
      topics/               — t1–t6: frames das funcionalidades nos 6 tópicos
      og-iasketchup.jpg     — card de prévia (1200×630)
      logo-renderlab-ai.png, sketchup-white.png, luiz-montani.jpg, sizzle-poster.jpg
  favicon-16/32.png, icon-192.png, apple-touch-icon.png
```

## Prévia de link (Open Graph)

Card em `assets/img/og-iasketchup.jpg` (1200×630, RenderLAB + SketchUp). Definido nas meta `og:image`/`twitter:image` do `<head>` com URL absoluta do domínio. Após publicar, rodar o [Sharing Debugger da Meta](https://developers.facebook.com/tools/debug/) ("Scrape Again") pra limpar o cache da prévia.

## Pendências (não bloqueiam o deploy)

- **Data do evento confirmada: 13/07/2026 às 20h** (variável `EVENT` no `<script>` já está `2026-07-13T20:00:00-03:00`).
- **Integração MailerLite + ManyChat LIGADA (18/06/2026)** — via `wrangler secret`:
  - `MAILERLITE_API_KEY` ✓ · `MAILERLITE_GROUP_ID` = `191751794033952502` (grupo "Leads - Lançamento sketchup") ✓ · `MANYCHAT_API_TOKEN` ✓ (página Montani3d Studio)
  - Testado ponta a ponta: lead cai no grupo do MailerLite (teste feito e apagado).
  - `MANYCHAT_FLOW_NS` = `content20260701012019_083117` (Flow **"[L - Sketchup] Boas-vindas - Captação"**) ✓ — integração 100% ligada.
  - O worker chama a API do ManyChat direto: `createSubscriber` (WhatsApp) + `sendFlow` (esse ns). **Não usa gatilho/automação** do ManyChat. Contatos são identificados por telefone (não e-mail).
  - Deploy é `npx wrangler deploy`; secrets são setadas com `npx wrangler secret put NOME` (de dentro desta pasta).

## Vídeo sizzle

Editado no projeto Remotion em `../_renderlab-sizzle-remotion/`. Pra re-renderizar: instalar deps lá e `npx remotion render Sizzle out/renderlab-sizzle.mp4 --codec=h264`, depois comprimir < 25 MB e muxar a trilha (LaFaye – Hidden, a partir dos 19s). Trilha é placeholder licenciável.
