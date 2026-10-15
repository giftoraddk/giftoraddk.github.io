# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # dev server at http://localhost:5000
pnpm build      # production static build (runs build:embed first)
pnpm build:embed # every src/packages/llm/svc-*.js → public/embed/<tag>.js — standalone embed bundles (vite.standalone.mjs)
pnpm preview    # preview the production build
pnpm run webs   # bundle Lit components (vite.webs.mjs)
pnpm run mega   # bundle with aggressive minification + obfuscation (vite.mega.mjs)
pnpm build:zap-share  # Chrome extension — every extension is zap-<name> (src/packages/zap-share/chrome, hook/ZAP-SHARE.rst) → dist-zap/share/dev; build:zap-share:store → dist-zap/share/store + store.zip
```

No test runner or linter is configured.

## Workflow rules

- **Never run `git commit` (or any git write action) automatically.** The user always commits their own work.
- **Never test features yourself** (dev server, browser checks, etc.) unless explicitly asked. The user tests manually.
- **At most 1 agent at a time** — never run subagents in parallel; prefer doing the work directly.
- **Tests come last** — don't write or run tests until the whole feature is done and the user asks (typecheck is fine).
- **Never poll a backgrounded job** (`sleep`/`ps`/`pgrep`/`top`, etc.). Do other work or end your reply — you'll be woken with its output automatically.

## Architecture

Static site: **Astro 6** (`output: 'static'`) + **Lit 3 Web Components** + **Tailwind CSS 4** + **ApexUI** theming via `data-theme="dark|light"` on `<html>`.

Path alias: `@/` → `src/`.

### Three Core Systems

| System | Source | Role |
|---|---|---|
| **Conductor** | `src/services/core/conductor` | Shared nanostores atom + IndexedDB cache. All services share one store; each service owns one `section` in `state.sections[]` keyed by id. |
| **Web Boxs** | `src/webs/apex/web-boxs.js` | Declarative card-grid renderer. Receives `data[]` + `config` object. Config files live in `src/sections/<domain>/`. |
| **Micro Services** | `src/packages/<domain>/svc-*.js` | Self-contained Lit custom elements. Each reads/writes its own conductor section and dispatches events up through Shadow DOM. |
