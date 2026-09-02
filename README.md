# astro-web

Static site — Astro 6 + Lit Web Components + Tailwind CSS.

## For AI Assistants

Before working on any task, read the relevant context file:

| Topic | Context file |
|-------|-------------|
| `web-boxs`, `box configs`, `src/pages/boxs` | [`guide/WEBBOXS_CONTEXT.md`](guide/WEBBOXS_CONTEXT.md) |

## Structure

```
src/
  layouts/       Astro layouts
  pages/         Routes (src/pages/boxs/ = box demos)
  webs/apex/     Lit Web Components
  styles/
guide/           AI context files
```

## Commands

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm run preview  # preview build
```

## Themes

Set `data-theme` on `<html>` in `Layout.astro`. themes: `light`, `dark`
