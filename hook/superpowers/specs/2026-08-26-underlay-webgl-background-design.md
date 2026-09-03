# svc-underlay — WebGL background layer

**Status:** Approved design, pre-implementation
**File:** `src/webs/underlay/svc-underlay.js`
**Related:** `src/webs/apex/web-bg.js` (Canvas2D background primitive — not shared with this component; see "Relationship to web-bg" below)

## Goal

A new Lit custom element `<svc-underlay>` rendering GPU-driven decorative particle
backgrounds (bubbles / stars / dots) via raw WebGL, tuned to stay smooth on weak
devices, with an optional dev-only FPS overlay.

## Relationship to web-bg

Written completely independently — no shared config object, no imports from
`web-bg.js` beyond copying the general shape of a couple of pure color-math
helpers (HSL derivation from a tint), which are duplicated locally rather than
imported, per this repo's domain-isolation convention. `web-bg.js` keeps
handling Canvas2D gradients/patterns for cards and sections as it does today;
`<svc-underlay>` is a separate, standalone component. If it proves out, it may
later replace `web-bg` for hero/page-level use — that migration is explicitly
out of scope for this work.

## Rendering architecture

- Raw WebGL2 with WebGL1 fallback. No three.js/pixi or any other rendering
  dependency — consistent with the project's zero-extra-deps philosophy and
  with how `web-bg.js` hand-rolls Canvas2D instead of using a library.
- **GPU-driven simulation**: one VBO of static per-particle attributes (seed,
  base position, phase, size seed) uploaded once at init. All motion is
  computed in the vertex shader from a single `u_time` uniform, so per-frame
  JS cost is O(1) — updating a handful of uniforms — regardless of particle
  count. This is what keeps CPU cost flat on weak machines even with hundreds
  of particles.
- **Single draw call per instance**: `gl.drawArrays(gl.POINTS, ...)`.
  `gl_PointSize` is computed in the vertex shader; a soft circular falloff is
  computed in the fragment shader from `gl_PointCoord` distance. No textures,
  minimal fill-rate cost.
- **Three concepts share one shader pair**, selected via a uniform:
  - `bubbles` — drifts upward along the `deg` direction, gentle horizontal
    wobble, slow alpha pulse.
  - `stars` — near-static position, twinkle via a per-particle sine phase on
    alpha/size, very slow drift along `deg`.
  - `dots` — near-static, size/alpha boost driven by distance to the pointer
    (`u_pointer` uniform, computed entirely in-shader — no per-particle JS
    loop, unlike web-bg's pattern hover).

## Multi-instance visibility lifecycle

Multiple `<svc-underlay>` instances may exist on a page simultaneously (one
per section/card, like `web-bg`). Each owns its own canvas/WebGL context, but:

- The WebGL context is **lazily created** the first time the instance enters
  the viewport (via `IntersectionObserver`), and **fully destroyed** (via the
  `WEBGL_lose_context` extension) — not merely paused — once the instance has
  been out of view for a short grace period. This bounds the number of live
  WebGL contexts to what's actually on-screen, avoiding the browser's
  per-tab context ceiling (typically 8–16) even on pages with many instances.
- On entering view: fade in via CSS opacity transition, init/resume the
  context, register with the shared ticker.
- On leaving view: fade out over ~300–400ms, then — only if still out of view
  after that — stop ticking and destroy the context. The grace delay avoids
  thrashing context creation/destruction during fast scrolling.
- One shared, module-level `requestAnimationFrame` ticker (mirroring the
  `_ticker` pattern in `web-bg.js`) drives every currently-visible instance,
  so N visible instances cost one rAF loop, not N.

## Auto-adaptive quality

- FPS is measured from the shared ticker's own frame deltas — no extra rAF
  loop dedicated to measurement.
- Roughly every 1s: if average FPS stays under a low watermark for two
  consecutive checks, drop one quality tier (fewer particles, lower
  devicePixelRatio cap, disable glow); if consistently above a high watermark
  with headroom, step back up. A hysteresis band between the two watermarks
  prevents oscillation.
- Three built-in tiers — low / medium / high — control particle count, DPR
  cap, and point-size/glow cost.
- `quality` prop: `''` (auto, default) | `'low'` | `'medium'` | `'high'`.
  Setting an explicit value disables auto-adjustment and pins that tier.

## Props

Discrete props only (no compound/pattern-style strings):

| Prop | Type | Meaning |
|---|---|---|
| `theme` | String | Synced from global `data-theme`, overridable — same pattern as `web-bg` |
| `tint` | String (hex/rgb) | Seed color for particle palette generation |
| `mono` | Boolean | Monotone palette derived from `tint` |
| `deg` | Number | Drift direction for bubbles/stars; ignored by dots |
| `concept` | String | `'bubbles'` \| `'stars'` \| `'dots'` |
| `density` | Number | Particle count (multiplier over the active tier's base count) |
| `speed` | Number | Motion speed multiplier |
| `size` | String | `"min~max"` px range |
| `quality` | String | `''` \| `'low'` \| `'medium'` \| `'high'` |
| `fixed` | Boolean, reflect | `position: fixed` instead of `absolute` — mirrors `web-bg` |
| `rounded` | String | border-radius on the wrapper |
| `debug` | Boolean | Enables the shared FPS overlay |

No `service` / `_data` / `_actived` / `value` / `actived` props — this
component is purely decorative and never reads or writes a conductor section,
so the standard `svc-*` data-plumbing props would be unused boilerplate.

## Debug FPS overlay

- Not per-instance. A single module-level singleton badge element is lazily
  mounted to `document.body` the first time any instance has `debug=true`,
  and unmounted once no instance has debug enabled.
- Fixed to the top of the viewport (e.g. top-right), showing current FPS
  updated a couple of times per second, reusing the measurement already
  computed for auto-adaptive quality (no separate loop).
- Always visible while any instance has debug on — not gated on pointer
  interaction.

## Fallback / robustness

- WebGL2/WebGL1 support is feature-detected once and cached at module scope.
- No WebGL available → render nothing (transparent), fail silently. An
  underlay is decorative, never load-bearing, so failing open is safer than
  forcing a flat color that might clash with the surrounding design.
- `webglcontextlost` → stop ticking, mark the instance dead.
  `webglcontextrestored` → rebuild buffers/shaders and resume.
- `prefers-reduced-motion` → freeze motion at a single static frame; particles
  stay visible but stop animating — mirrors `web-bg`'s existing handling.

## Out of scope

- Sharing a config object / props surface with `web-bg`.
- Any conductor/service integration.
- Migrating existing `web-bg` usages to this component.
