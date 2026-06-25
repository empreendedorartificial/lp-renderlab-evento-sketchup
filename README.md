# LP — Live de lançamento: IA dentro do SketchUp (RenderLAB)

Página de captação da live de lançamento da funcionalidade **IA dentro do SketchUp** usando o RenderLAB.

## Deploy

**Domínio:** https://iasketchup.montani3d.com.br/
**Repo:** https://github.com/empreendedorartificial/lp-renderlab-evento-sketchup

Repositório git conectado ao Cloudflare Pages. Build: framework **None**, build command vazio, output `/`. Alteração → `git commit` + `git push` → deploy automático em ~30s.

> Migrada da Vercel (preview temporário) para o padrão git + Cloudflare Pages em jun/2026.

## Stack

- HTML único com CSS e JS inline (~60KB)
- Fundo animado em `<canvas>` (flow field), galeria imersiva no hero
- Vídeo sizzle (sizzle-hd3.mp4) produzido no Remotion — fonte em `../_renderlab-sizzle-remotion/`
- Vídeos comprimidos < 25 MB cada (limite de arquivo do Cloudflare Pages)
- Zero dependências externas

## Estrutura

```
index.html                  — página completa
assets/
  video/                    — sizzle-hd3.mp4 (vídeo principal), feat-*.mp4 (funcionalidades),
                              hero-clip-a/b.mp4 (galeria do hero), renderlab1.mp4 (vertical)
  img/
    renders/                — renders limpos usados na galeria e nas personas
    topics/                 — t1–t6: frames das funcionalidades nos 6 tópicos
    hero/                   — frames extras
    logo-renderlab-ai.png, sketchup-white.png, luiz-montani.jpg, sizzle-poster.jpg
favicon-16/32.png, icon-192.png, apple-touch-icon.png
```

## Prévia de link (Open Graph)

Card em `assets/img/og-iasketchup.jpg` (1200×630, RenderLAB + SketchUp). Definido nas meta `og:image`/`twitter:image` do `<head>` com URL absoluta do domínio. Após publicar, rodar o [Sharing Debugger da Meta](https://developers.facebook.com/tools/debug/) ("Scrape Again") pra limpar o cache da prévia.

## Pendências (não bloqueiam o deploy)

- **Data real do evento** — hoje placeholder `2026-07-08T20:00` no `<script>` (variável `EVENT`).
- **Integração do formulário** — o modal de inscrição está em placeholder; conectar **MailerLite** (e-mail) + **ManyChat** (WhatsApp).

## Vídeo sizzle

Editado no projeto Remotion em `../_renderlab-sizzle-remotion/`. Pra re-renderizar: instalar deps lá e `npx remotion render Sizzle out/renderlab-sizzle.mp4 --codec=h264`, depois comprimir < 25 MB e muxar a trilha (LaFaye – Hidden, a partir dos 19s). Trilha é placeholder licenciável.
