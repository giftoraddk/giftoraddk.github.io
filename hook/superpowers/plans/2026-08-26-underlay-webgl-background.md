# svc-underlay WebGL Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `<svc-underlay>`, a raw-WebGL decorative particle background (bubbles/stars/dots concepts) that self-tunes for weak devices and exposes an optional dev FPS overlay.

**Architecture:** A Lit custom element wraps a per-particle-instanced WebGL point-sprite renderer. All particle motion is computed on the GPU from a single `u_time` uniform (per-frame JS cost is O(1), not O(particle count)). Each instance lazily creates its WebGL context on entering the viewport and fully destroys it (with a fresh canvas swap) after a fade-out grace period once it leaves — bounding live contexts to what's on-screen. FPS is sampled from a shared module-level `requestAnimationFrame` ticker and feeds both an auto-adaptive quality tier system and an optional debug overlay.

**Tech Stack:** Lit 3 (existing dependency), raw WebGL1/WebGL2 (no rendering library), vanilla DOM for the debug badge singleton.

**Design doc:** `docs/superpowers/specs/2026-08-26-underlay-webgl-background-design.md`

---

## Project constraints (read before executing any task)

This repo's `CLAUDE.md` overrides the generic plan-execution defaults:

- **No test runner or linter is configured in this repo.** Do not add one. Every task below replaces the standard "write failing test → implement → make it pass" loop with "write the file → self-check by reading it back for the specific things listed in the step." There is no `pytest`/`vitest`/etc. to run.
- **Never run `git commit` (or any git write action) automatically.** Do not add commit steps. The user commits their own work — when a task is done, just stop and report the files changed.
- **Never start the dev server or open a browser to test.** The user tests manually. Task 7 below is a checklist *for the user*, not something the executing agent runs.
- **No git worktree.** Implement directly on the current branch (`v2`) in the existing working directory — do not create a worktree.

---

## File structure

```
src/webs/underlay/
  svc-underlay.js          # Lit custom element — lifecycle, prop wiring, render loop
  fps-badge.js              # Singleton dev FPS badge (vanilla DOM, shared across instances)
  styles/
    underlay.css            # Host/wrapper/canvas styles, fade transition
  gl/
    color.js                 # Pure tint → per-particle RGB palette helpers (no WebGL/DOM deps)
    ticker.js                 # Shared rAF loop + rolling FPS measurement (mirrors web-bg's _ticker)
    quality.js                 # Auto-adaptive quality tier state machine (hysteresis)
    shaders.js                  # GLSL vertex/fragment source strings + concept enum
    context.js                   # WebGL feature-detect, context/program/buffer helpers, quality tier table
```

Each `gl/*.js` file is a plain ES module with no Lit/DOM-heavy dependencies (except `context.js`, which necessarily touches `document.createElement('canvas')` once for feature detection) — they can be read and reasoned about independently of the component.

---

### Task 1: Pure color helpers

**Files:**
- Create: `src/webs/underlay/gl/color.js`

- [ ] **Step 1: Write the file**

```js
// src/webs/underlay/gl/color.js
// Pure color math — deliberately not imported from web-bg.js (domain isolation).

export function hexToHsl(hex) {
    if (!hex || typeof hex !== 'string') return { h: 230, s: 60, l: 65 };
    let r = 0, g = 0, b = 0;
    const c = hex.trim();
    if (c.startsWith('#')) {
        if (c.length === 4) {
            r = parseInt(c[1] + c[1], 16);
            g = parseInt(c[2] + c[2], 16);
            b = parseInt(c[3] + c[3], 16);
        } else {
            r = parseInt(c.substring(1, 3), 16);
            g = parseInt(c.substring(3, 5), 16);
            b = parseInt(c.substring(5, 7), 16);
        }
    } else if (c.startsWith('rgb')) {
        const m = c.match(/\d+/g);
        if (m) [r, g, b] = m.map(Number);
    } else {
        return { h: 230, s: 60, l: 65 };
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb01(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    s = Math.min(1, Math.max(0, s / 100));
    l = Math.min(1, Math.max(0, l / 100));
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    return [hue2rgb(h + 1 / 3), hue2rgb(h), hue2rgb(h - 1 / 3)];
}

// Returns a Float32Array of length count*3 — one RGB triple (0..1) per particle,
// baked once at buffer-build time (color never changes per-frame in the shader).
export function generatePalette(tint, mono, count) {
    const base = hexToHsl(tint);
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        let h, s, l;
        if (mono) {
            h = base.h;
            s = Math.min(100, base.s + (Math.random() * 16 - 8));
            l = Math.min(88, Math.max(35, base.l + (Math.random() * 30 - 15)));
        } else {
            h = (base.h + (Math.random() * 70 - 35) + 360) % 360;
            s = Math.min(100, Math.max(40, base.s + (Math.random() * 20 - 10)));
            l = Math.min(85, Math.max(45, base.l + (Math.random() * 20 - 10)));
        }
        const [r, g, b] = hslToRgb01(h, s, l);
        out[i * 3] = r;
        out[i * 3 + 1] = g;
        out[i * 3 + 2] = b;
    }
    return out;
}
```

- [ ] **Step 2: Self-check**

Read the file back and confirm: `hexToHsl` handles 3-digit hex, 6-digit hex, `rgb(...)`, and an invalid/empty input (returns the `{h:230,s:60,l:65}` fallback instead of throwing). Confirm `generatePalette` returns a `Float32Array` of length `count * 3` with every value in `[0, 1]`.

---

### Task 2: Shared ticker + adaptive quality controller

**Files:**
- Create: `src/webs/underlay/gl/ticker.js`
- Create: `src/webs/underlay/gl/quality.js`

- [ ] **Step 1: Write the ticker**

```js
// src/webs/underlay/gl/ticker.js
// One shared requestAnimationFrame loop for every visible <svc-underlay> instance,
// mirroring the _ticker pattern in src/webs/apex/web-bg.js. Also tracks a rolling
// FPS estimate from its own frame deltas — no extra rAF loop needed for measurement.

const _set = new Set();
let _raf = 0;
let _lastNow = 0;
let _fps = 60;

function _loop(now) {
    _raf = 0;
    const dt = _lastNow ? now - _lastNow : 16.7;
    _lastNow = now;
    if (dt > 0) {
        const instantFps = 1000 / dt;
        _fps += (instantFps - _fps) * 0.1; // exponential moving average
    }
    for (const inst of Array.from(_set)) {
        const keepGoing = inst._tick(now);
        if (!keepGoing) _set.delete(inst);
    }
    if (_set.size) {
        _raf = requestAnimationFrame(_loop);
    } else {
        _lastNow = 0; // reset so the next add() doesn't compute a stale dt
    }
}

export const ticker = {
    add(inst) {
        _set.add(inst);
        if (!_raf) _raf = requestAnimationFrame(_loop);
    },
    remove(inst) {
        _set.delete(inst);
    },
    getFps() {
        return _fps;
    },
};
```

- [ ] **Step 2: Write the quality controller**

```js
// src/webs/underlay/gl/quality.js
// Auto-adaptive quality tier with hysteresis, plus a manual pin.

export const TIERS = ['low', 'medium', 'high'];

const LOW_WATERMARK = 45;
const HIGH_WATERMARK = 55;
const DOWNGRADE_STREAK = 2;
const UPGRADE_STREAK = 3;

export function createQualityController(startTier) {
    let tierIndex = Math.max(0, TIERS.indexOf(startTier));
    let mode = 'auto'; // 'auto' | 'manual'
    let lowStreak = 0;
    let highStreak = 0;

    return {
        get tier() {
            return TIERS[tierIndex];
        },
        setManual(tier) {
            const idx = TIERS.indexOf(tier);
            if (idx === -1) return;
            mode = 'manual';
            tierIndex = idx;
            lowStreak = 0;
            highStreak = 0;
        },
        setAuto() {
            mode = 'auto';
            lowStreak = 0;
            highStreak = 0;
        },
        // Returns true if the tier changed as a result of this sample.
        sample(fps) {
            if (mode !== 'auto') return false;
            if (fps < LOW_WATERMARK) {
                lowStreak++;
                highStreak = 0;
            } else if (fps > HIGH_WATERMARK) {
                highStreak++;
                lowStreak = 0;
            } else {
                lowStreak = 0;
                highStreak = 0;
            }
            if (lowStreak >= DOWNGRADE_STREAK && tierIndex > 0) {
                tierIndex--;
                lowStreak = 0;
                return true;
            }
            if (highStreak >= UPGRADE_STREAK && tierIndex < TIERS.length - 1) {
                tierIndex++;
                highStreak = 0;
                return true;
            }
            return false;
        },
    };
}
```

- [ ] **Step 3: Self-check**

Read both files back. Confirm `ticker.add`/`ticker.remove` operate on the same module-level `Set` regardless of which component instance calls them (no per-instance state leaks between files). Confirm `createQualityController('medium').tier === 'medium'`, and trace through `sample()` by hand for two consecutive calls with `fps=40` — the second call should return `true` and drop the tier by one step (since `DOWNGRADE_STREAK` is 2).

---

### Task 3: Shaders + WebGL context/buffer helpers

**Files:**
- Create: `src/webs/underlay/gl/shaders.js`
- Create: `src/webs/underlay/gl/context.js`

- [ ] **Step 1: Write the shaders**

```js
// src/webs/underlay/gl/shaders.js
// GLSL ES 1.00 (attribute/varying) — valid under both WebGL1 and WebGL2 contexts,
// so the same source works regardless of which one createGL() ends up with.

export const CONCEPTS = { bubbles: 0, stars: 1, dots: 2 };

export const VERTEX_SRC = `
precision mediump float;

attribute vec2 a_seed;
attribute float a_phase;
attribute float a_sizeSeed;
attribute vec3 a_color;

uniform float u_time;
uniform int u_concept;
uniform float u_deg;
uniform float u_speed;
uniform float u_sizeMin;
uniform float u_sizeMax;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_pointer;

varying vec3 v_color;
varying float v_alpha;

void main() {
    float rad = radians(u_deg);
    vec2 dir = vec2(sin(rad), -cos(rad));

    vec2 pos = a_seed * 2.0 - 1.0;
    float t = u_time * 0.001 * u_speed;
    float size = mix(u_sizeMin, u_sizeMax, a_sizeSeed);
    float alpha = 1.0;

    if (u_concept == 0) {
        // bubbles: rise along dir, wrap, gentle wobble, slow alpha pulse
        float travel = fract(t * 0.05 + a_seed.x);
        pos += dir * (travel * 2.0 - 1.0);
        pos.x += sin(t * 1.3 + a_phase) * 0.04;
        alpha = 0.35 + 0.35 * sin(t * 2.0 + a_phase);
    } else if (u_concept == 1) {
        // stars: near-static, twinkle, very slow drift
        pos += dir * t * 0.01;
        pos = mod(pos + 1.0, 2.0) - 1.0;
        float tw = 0.5 + 0.5 * sin(t * 3.0 + a_phase * 3.0);
        alpha = 0.4 + 0.6 * tw;
        size *= 0.7 + 0.3 * tw;
    } else {
        // dots: static, pointer-proximity size/alpha boost
        vec2 px = (pos * 0.5 + 0.5) * u_resolution;
        float dist = distance(px, u_pointer);
        float prox = 1.0 - smoothstep(0.0, 140.0, dist);
        size *= 1.0 + prox * 1.8;
        alpha = 0.25 + 0.55 * prox;
    }

    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = max(1.0, size * u_dpr);
    v_color = a_color;
    v_alpha = clamp(alpha, 0.0, 1.0);
}
`;

export const FRAGMENT_SRC = `
precision mediump float;

uniform float u_glow;

varying vec3 v_color;
varying float v_alpha;

void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float dist = length(d) * 2.0;
    float falloff = u_glow > 0.5 ? (1.0 - smoothstep(0.6, 1.0, dist)) : step(dist, 0.9);
    if (falloff <= 0.0) discard;
    gl_FragColor = vec4(v_color, v_alpha * falloff);
}
`;
```

- [ ] **Step 2: Write the WebGL context/buffer helpers**

```js
// src/webs/underlay/gl/context.js

export const QUALITY_TIERS = {
    low: { particleBase: 50, dprCap: 1, glow: false },
    medium: { particleBase: 130, dprCap: 1.5, glow: true },
    high: { particleBase: 260, dprCap: 2, glow: true },
};

// 7 floats per particle: seedX, seedY, phase, sizeSeed, r, g, b
export const STRIDE = 7;

let _supported = null;
export function supportsWebGL() {
    if (_supported !== null) return _supported;
    try {
        const c = document.createElement('canvas');
        _supported = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
        _supported = false;
    }
    return _supported;
}

export function createGL(canvas) {
    const opts = {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
    };
    let gl = canvas.getContext('webgl2', opts);
    let isWebGL2 = true;
    if (!gl) {
        gl = canvas.getContext('webgl', opts);
        isWebGL2 = false;
    }
    if (!gl) return null;
    return { gl, isWebGL2 };
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
}

export function createProgram(gl, vertSrc, fragSrc) {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Program link error: ${info}`);
    }
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
}

// Interleaves per-particle seed/phase/size/color into one Float32Array
// matching STRIDE, ready for a single gl.bufferData call.
export function buildParticleData(count, palette) {
    const data = new Float32Array(count * STRIDE);
    for (let i = 0; i < count; i++) {
        const o = i * STRIDE;
        data[o] = Math.random();
        data[o + 1] = Math.random();
        data[o + 2] = Math.random() * Math.PI * 2;
        data[o + 3] = Math.random();
        data[o + 4] = palette[i * 3];
        data[o + 5] = palette[i * 3 + 1];
        data[o + 6] = palette[i * 3 + 2];
    }
    return data;
}

export function applyBlendMode(gl, theme) {
    gl.enable(gl.BLEND);
    if (theme === 'light') {
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    } else {
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
    }
}

export function destroyGL(gl) {
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
}
```

- [ ] **Step 3: Self-check**

Read both files back. Confirm `STRIDE` (7) matches the number of values written per particle in `buildParticleData` (seedX, seedY, phase, sizeSeed, r, g, b = 7). Confirm every uniform referenced in `shaders.js` (`u_time`, `u_concept`, `u_deg`, `u_speed`, `u_sizeMin`, `u_sizeMax`, `u_resolution`, `u_dpr`, `u_pointer`, `u_glow`) and every attribute (`a_seed`, `a_phase`, `a_sizeSeed`, `a_color`) is a name you'll be able to look up with `gl.getUniformLocation`/`gl.getAttribLocation` by exactly that string in Task 6 — write down this list, Task 6's `_locs` object must match it exactly.

---

### Task 4: Debug FPS badge singleton

**Files:**
- Create: `src/webs/underlay/fps-badge.js`

- [ ] **Step 1: Write the file**

```js
// src/webs/underlay/fps-badge.js
// One shared badge element for the whole page, reference-counted across every
// <svc-underlay debug> instance so N debug instances still mount only one DOM node.

let badgeEl = null;
let refCount = 0;

function mountBadge() {
    badgeEl = document.createElement('div');
    badgeEl.style.cssText = [
        'position:fixed', 'top:8px', 'left:50%', 'transform:translateX(-50%)',
        'z-index:2147483647', 'padding:2px 8px', 'border-radius:999px',
        'font:600 11px/1.6 monospace', 'color:#0f0', 'background:rgba(0,0,0,0.65)',
        'pointer-events:none', 'letter-spacing:.02em',
    ].join(';');
    badgeEl.textContent = 'FPS: --';
    document.body.appendChild(badgeEl);
}

function unmountBadge() {
    badgeEl?.remove();
    badgeEl = null;
}

// Call when an instance turns debug on. Returns an unregister function —
// call it when that instance turns debug off or disconnects.
export function registerDebug() {
    refCount++;
    if (refCount === 1) mountBadge();
    let active = true;
    return () => {
        if (!active) return;
        active = false;
        refCount = Math.max(0, refCount - 1);
        if (refCount === 0) unmountBadge();
    };
}

export function updateFpsBadge(fps) {
    if (badgeEl) badgeEl.textContent = `FPS: ${Math.round(fps)}`;
}
```

- [ ] **Step 2: Self-check**

Read the file back. Confirm calling the function returned by `registerDebug()` twice is a no-op the second time (the `active` flag guards it) — this matters because `svc-underlay.js` will call the unregister function on both prop-change-to-false and `disconnectedCallback`, and double-decrementing `refCount` would unmount the badge while another instance still has `debug=true`.

---

### Task 5: Component styles

**Files:**
- Create: `src/webs/underlay/styles/underlay.css`

- [ ] **Step 1: Write the file**

```css
/* src/webs/underlay/styles/underlay.css */

:host {
    display: block;
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
}

:host([fixed]) {
    position: fixed;
}

.underlay-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.underlay-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    opacity: 0;
    transition: opacity 350ms ease;
}

.underlay-canvas.is-visible {
    opacity: 1;
}
```

- [ ] **Step 2: Self-check**

Confirm the `350ms` transition duration here matches the `FADE_MS` constant you'll define in Task 6 exactly — they must stay in sync since Task 6's destroy-timer waits for the fade to visually finish before tearing down the WebGL context.

---

### Task 6: Main component — svc-underlay.js

**Files:**
- Create: `src/webs/underlay/svc-underlay.js`

- [ ] **Step 1: Write the file**

```js
// src/webs/underlay/svc-underlay.js
import { LitElement, html, unsafeCSS } from 'lit';
import styles from './styles/underlay.css?inline';
import { hexToHsl, generatePalette } from './gl/color.js';
import { ticker } from './gl/ticker.js';
import { createQualityController } from './gl/quality.js';
import { VERTEX_SRC, FRAGMENT_SRC, CONCEPTS } from './gl/shaders.js';
import {
    QUALITY_TIERS, supportsWebGL, createGL, createProgram,
    STRIDE, buildParticleData, applyBlendMode, destroyGL,
} from './gl/context.js';
import { registerDebug, updateFpsBadge } from './fps-badge.js';

const FADE_MS = 350; // must match styles/underlay.css .underlay-canvas transition
const DESTROY_GRACE_MS = 500;
const QUALITY_SAMPLE_MS = 1000;

export class SvcUnderlay extends LitElement {
    static properties = {
        theme: { type: String },
        tint: { type: String },
        mono: { type: Boolean },
        deg: { type: Number },
        concept: { type: String },
        density: { type: Number },
        speed: { type: Number },
        size: { type: String },
        quality: { type: String },
        fixed: { type: Boolean, reflect: true },
        rounded: { type: String },
        debug: { type: Boolean },
    };

    static styles = [unsafeCSS(styles)];

    constructor() {
        super();
        this.theme = '';
        this.tint = '#6d8dff';
        this.mono = false;
        this.deg = 0;
        this.concept = 'dots';
        this.density = 1;
        this.speed = 1;
        this.size = '1~3';
        this.quality = '';
        this.fixed = false;
        this.rounded = '0px';
        this.debug = false;

        this._canvas = null;
        this._glCtx = null;
        this._program = null;
        this._buffer = null;
        this._particleCount = 0;
        this._locs = null;
        this._dpr = 1;
        this._qualityCtl = null;
        this._lastQualitySample = 0;
        this._io = null;
        this._ro = null;
        this._themeObserver = null;
        this._visible = false;
        this._destroyTimer = null;
        this._unregisterDebug = null;
        this._prefersReducedMotion = false;
        this._pointerX = -9999;
        this._pointerY = -9999;
        this._rect = null;
        this._scrollPending = false;

        this._handlePointerMove = this._handlePointerMove.bind(this);
        this._handleScroll = this._handleScroll.bind(this);
        this._handleContextLost = this._handleContextLost.bind(this);
        this._handleContextRestored = this._handleContextRestored.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        this._prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

        const cores = navigator.hardwareConcurrency || 4;
        const startTier = cores <= 2 ? 'low' : cores <= 6 ? 'medium' : 'high';
        this._qualityCtl = createQualityController(this.quality || startTier);
        if (this.quality) this._qualityCtl.setManual(this.quality);

        this._syncTheme();
        this._themeObserver = new MutationObserver(() => this._syncTheme());
        this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        this._io = new IntersectionObserver(
            (entries) => this._onIntersect(entries[0]?.isIntersecting ?? false),
            { threshold: 0 },
        );
        this._io.observe(this);

        if (this.debug) this._unregisterDebug = registerDebug();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._themeObserver?.disconnect();
        this._io?.disconnect();
        this._ro?.disconnect();
        window.removeEventListener('pointermove', this._handlePointerMove);
        window.removeEventListener('scroll', this._handleScroll, { capture: true });
        clearTimeout(this._destroyTimer);
        ticker.remove(this);
        this._teardownGL();
        this._unregisterDebug?.();
        this._unregisterDebug = null;
    }

    updated(changedProperties) {
        if (changedProperties.has('theme')) {
            if (this.theme) this.setAttribute('data-theme', this.theme);
            else this.removeAttribute('data-theme');
        }

        const canvasEl = this.shadowRoot?.querySelector('.underlay-canvas') || null;
        if (canvasEl && canvasEl !== this._canvas) {
            this._canvas = canvasEl;
            this._canvas.addEventListener('webglcontextlost', this._handleContextLost);
            this._canvas.addEventListener('webglcontextrestored', this._handleContextRestored);
            if (this._visible) this._initGL();
        }

        if (changedProperties.has('debug')) {
            this._unregisterDebug?.();
            this._unregisterDebug = this.debug ? registerDebug() : null;
        }

        if (changedProperties.has('quality')) {
            if (this.quality) this._qualityCtl?.setManual(this.quality);
            else this._qualityCtl?.setAuto();
        }

        if (this._glCtx && (changedProperties.has('tint') || changedProperties.has('mono') ||
            changedProperties.has('density') || changedProperties.has('concept'))) {
            this._rebuildParticles();
        }

        if (this._canvas && changedProperties.has('concept')) {
            this._syncPointerListener();
        }
    }

    _syncTheme() {
        const globalTheme = document.documentElement.getAttribute('data-theme') || '';
        if (!this.hasAttribute('theme')) this.theme = globalTheme;
    }

    _onIntersect(isIntersecting) {
        this._visible = isIntersecting;
        if (isIntersecting) {
            clearTimeout(this._destroyTimer);
            this._destroyTimer = null;
            if (this._canvas && !this._glCtx) this._initGL();
            if (this._canvas) this._canvas.classList.add('is-visible');
            if (this._glCtx) ticker.add(this);
            this._syncPointerListener();
        } else {
            if (this._canvas) this._canvas.classList.remove('is-visible');
            this._syncPointerListener();
            clearTimeout(this._destroyTimer);
            this._destroyTimer = setTimeout(() => {
                if (!this._visible) {
                    ticker.remove(this);
                    this._teardownGL();
                }
            }, FADE_MS + DESTROY_GRACE_MS);
        }
    }

    _syncPointerListener() {
        const wantsPointer = this._visible && this.concept === 'dots';
        window.removeEventListener('pointermove', this._handlePointerMove);
        window.removeEventListener('scroll', this._handleScroll, { capture: true });
        if (wantsPointer) {
            window.addEventListener('pointermove', this._handlePointerMove);
            window.addEventListener('scroll', this._handleScroll, { passive: true, capture: true });
            this._rect = this._canvas?.getBoundingClientRect() ?? null;
        }
    }

    _handlePointerMove(e) {
        if (!this._rect) return;
        const dpr = window.devicePixelRatio || 1;
        this._pointerX = (e.clientX - this._rect.left) * dpr;
        this._pointerY = (e.clientY - this._rect.top) * dpr;
    }

    _handleScroll() {
        if (this._scrollPending || !this._canvas) return;
        this._scrollPending = true;
        requestAnimationFrame(() => {
            this._scrollPending = false;
            if (this._canvas) this._rect = this._canvas.getBoundingClientRect();
        });
    }

    _handleContextLost(e) {
        e.preventDefault();
        ticker.remove(this);
        this._glCtx = null;
        this._program = null;
        this._buffer = null;
    }

    _handleContextRestored() {
        if (this._visible) this._initGL();
    }

    _initGL() {
        if (!supportsWebGL() || !this._canvas) return;
        const created = createGL(this._canvas);
        if (!created) return;
        const { gl } = created;
        try {
            this._program = createProgram(gl, VERTEX_SRC, FRAGMENT_SRC);
        } catch {
            this._program = null;
            return;
        }
        this._glCtx = gl;
        this._locs = {
            a_seed: gl.getAttribLocation(this._program, 'a_seed'),
            a_phase: gl.getAttribLocation(this._program, 'a_phase'),
            a_sizeSeed: gl.getAttribLocation(this._program, 'a_sizeSeed'),
            a_color: gl.getAttribLocation(this._program, 'a_color'),
            u_time: gl.getUniformLocation(this._program, 'u_time'),
            u_concept: gl.getUniformLocation(this._program, 'u_concept'),
            u_deg: gl.getUniformLocation(this._program, 'u_deg'),
            u_speed: gl.getUniformLocation(this._program, 'u_speed'),
            u_sizeMin: gl.getUniformLocation(this._program, 'u_sizeMin'),
            u_sizeMax: gl.getUniformLocation(this._program, 'u_sizeMax'),
            u_resolution: gl.getUniformLocation(this._program, 'u_resolution'),
            u_dpr: gl.getUniformLocation(this._program, 'u_dpr'),
            u_pointer: gl.getUniformLocation(this._program, 'u_pointer'),
            u_glow: gl.getUniformLocation(this._program, 'u_glow'),
        };
        this._buffer = gl.createBuffer();
        applyBlendMode(gl, this.theme);
        this._ro = new ResizeObserver(() => this._onResize());
        this._ro.observe(this);
        this._onResize();
        this._rebuildParticles();
        if (this._visible) ticker.add(this);
    }

    _teardownGL() {
        this._ro?.disconnect();
        this._ro = null;
        if (this._glCtx) {
            if (this._buffer) this._glCtx.deleteBuffer(this._buffer);
            if (this._program) this._glCtx.deleteProgram(this._program);
            destroyGL(this._glCtx);
        }
        this._glCtx = null;
        this._program = null;
        this._buffer = null;
        this._locs = null;

        // WEBGL_lose_context puts the canvas's context in a permanently-lost
        // state until restoreContext() is explicitly called — simpler and more
        // reliable to swap in a fresh, never-attached canvas so the next
        // _initGL() call always gets a clean getContext() result.
        if (this._canvas) {
            const old = this._canvas;
            const fresh = old.cloneNode();
            old.replaceWith(fresh);
            old.removeEventListener('webglcontextlost', this._handleContextLost);
            old.removeEventListener('webglcontextrestored', this._handleContextRestored);
            this._canvas = fresh;
            this._canvas.addEventListener('webglcontextlost', this._handleContextLost);
            this._canvas.addEventListener('webglcontextrestored', this._handleContextRestored);
        }
    }

    _onResize() {
        if (!this._canvas || !this._glCtx) return;
        const rect = this.getBoundingClientRect();
        this._rect = rect;
        const tier = QUALITY_TIERS[this._qualityCtl.tier];
        const dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
        const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
        this._canvas.width = Math.round(w * dpr);
        this._canvas.height = Math.round(h * dpr);
        this._dpr = dpr;
        this._glCtx.viewport(0, 0, this._canvas.width, this._canvas.height);
    }

    _comSizeRange() {
        const parts = (this.size || '').split('~').map(Number);
        if (parts.length === 2 && parts.every(Number.isFinite)) return parts;
        return [1, 3];
    }

    _rebuildParticles() {
        const gl = this._glCtx;
        if (!gl) return;
        const tier = QUALITY_TIERS[this._qualityCtl.tier];
        const count = Math.max(8, Math.min(2000, Math.round(tier.particleBase * (this.density || 1))));
        const palette = generatePalette(this.tint, this.mono, count);
        const data = buildParticleData(count, palette);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        this._particleCount = count;
        applyBlendMode(gl, this.theme);
    }

    // Called every frame by the shared ticker while this instance is registered.
    // Returns false to have the ticker drop it (frozen reduced-motion frame, or
    // the GL context/canvas went away).
    _tick(now) {
        const gl = this._glCtx;
        if (!gl || !this._program || !this._canvas) return false;

        if (now - this._lastQualitySample > QUALITY_SAMPLE_MS) {
            this._lastQualitySample = now;
            if (!this.quality && this._qualityCtl.sample(ticker.getFps())) {
                this._onResize();
                this._rebuildParticles();
            }
            if (this.debug) updateFpsBadge(ticker.getFps());
        }

        const time = this._prefersReducedMotion ? 0 : now;
        const [sizeMin, sizeMax] = this._comSizeRange();
        const stride = STRIDE * 4; // bytes

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this._program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.enableVertexAttribArray(this._locs.a_seed);
        gl.vertexAttribPointer(this._locs.a_seed, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(this._locs.a_phase);
        gl.vertexAttribPointer(this._locs.a_phase, 1, gl.FLOAT, false, stride, 8);
        gl.enableVertexAttribArray(this._locs.a_sizeSeed);
        gl.vertexAttribPointer(this._locs.a_sizeSeed, 1, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(this._locs.a_color);
        gl.vertexAttribPointer(this._locs.a_color, 3, gl.FLOAT, false, stride, 16);

        gl.uniform1f(this._locs.u_time, time);
        gl.uniform1i(this._locs.u_concept, CONCEPTS[this.concept] ?? CONCEPTS.dots);
        gl.uniform1f(this._locs.u_deg, this.deg || 0);
        gl.uniform1f(this._locs.u_speed, this.speed || 1);
        gl.uniform1f(this._locs.u_sizeMin, sizeMin);
        gl.uniform1f(this._locs.u_sizeMax, sizeMax);
        gl.uniform2f(this._locs.u_resolution, this._canvas.width, this._canvas.height);
        gl.uniform1f(this._locs.u_dpr, this._dpr || 1);
        gl.uniform2f(this._locs.u_pointer, this._pointerX, this._pointerY);
        gl.uniform1f(this._locs.u_glow, QUALITY_TIERS[this._qualityCtl.tier].glow ? 1 : 0);

        gl.drawArrays(gl.POINTS, 0, this._particleCount);

        return !this._prefersReducedMotion;
    }

    render() {
        return html`
            <div class="underlay-wrapper" style="border-radius:${this.rounded};">
                <canvas class="underlay-canvas"></canvas>
            </div>
        `;
    }
}

if (!customElements.get('svc-underlay')) {
    customElements.define('svc-underlay', SvcUnderlay);
}

export default SvcUnderlay;
```

- [ ] **Step 2: Self-check against Task 3's uniform/attribute list**

Read the file back and compare the key list of the `_locs` object built in `_initGL()` against the list you wrote down at the end of Task 3. They must match exactly (same names, nothing missing, nothing extra) — a mismatch here is a silent bug (`gl.getUniformLocation` returns `null` for a typo'd name, and `gl.uniform1f(null, ...)` throws at draw time).

- [ ] **Step 3: Self-check the visibility/GL lifecycle**

Trace through by hand: (a) instance scrolls into view for the first time → `_onIntersect(true)` → `_initGL()` runs, buffer built, ticker registered, canvas fades in. (b) instance scrolls out → `_onIntersect(false)` → canvas fades out, a timer is armed for `FADE_MS + DESTROY_GRACE_MS`. (c) instance scrolls back into view *before* that timer fires → `clearTimeout` cancels it, `_glCtx` is still set so `_onIntersect`'s `if (this._canvas && !this._glCtx)` guard correctly skips re-init, ticker re-added, canvas fades back in — no needless context churn on a quick scroll-past. (d) instance stays out of view past the timer → `_teardownGL()` runs, replaces the canvas with a fresh clone, and the next entry into view goes through `_initGL()` again cleanly.

- [ ] **Step 4: Self-check prop-driven rebuilds**

Confirm that changing `tint`, `mono`, `density`, or `concept` while an instance is on-screen triggers `_rebuildParticles()` (via the `updated()` branch), and that changing `quality` correctly flips the controller between manual and auto without needing a rebuild by itself (the next `_tick`'s quality-sample branch handles rebuilding only when the *tier* actually changes).

---

### Task 7: Manual verification (for the user — do not run this yourself)

This repo has no automated test runner, and per `CLAUDE.md` this agent does not start the dev server or open a browser to self-test. Once Tasks 1–6 are done, hand off to the user with this checklist for them to run manually via `pnpm dev`:

- [ ] Drop `<svc-underlay concept="dots"></svc-underlay>` into a page and confirm it fades in only once scrolled into view, and fades out + stops (check DevTools Performance/`chrome://gpu` context count) once scrolled well out of view.
- [ ] Try all three `concept` values (`bubbles`, `stars`, `dots`) and confirm each reads as visually distinct and matches its described motion.
- [ ] Toggle `theme="light"` / `theme="dark"` (or flip the page's global `data-theme`) and confirm the blend mode/contrast looks right in both.
- [ ] Set `debug` on one instance and confirm the FPS badge appears once, stays put with multiple debug instances mounted/unmounted, and disappears once the last one turns debug off.
- [ ] Throttle CPU in DevTools ("6x slowdown") and confirm the particle count visibly drops after a few seconds (auto-adaptive downgrade) rather than the page just getting janky forever.
- [ ] Set `quality="low"` explicitly and confirm it stays pinned even under light throttling (manual override disables auto-adjustment).
- [ ] Toggle "Emulate prefers-reduced-motion: reduce" in DevTools and confirm particles freeze instead of animating.
- [ ] Place two or more `<svc-underlay>` instances on one page and confirm no console errors about exceeding the WebGL context limit.

---

## Spec coverage check

- Rendering architecture, GPU-driven motion, single draw call → Tasks 3, 6.
- Multi-instance visibility lifecycle (lazy create / fade / destroy) → Task 6 (`_onIntersect`, `_teardownGL`).
- Auto-adaptive quality + manual override → Tasks 2, 6.
- Discrete props table → Task 6 `static properties`.
- No conductor/service props → Task 6 (absent by omission, confirmed against the design doc's prop table).
- Debug FPS overlay (singleton, always-on while debug set) → Task 4, wired in Task 6.
- Fallback / robustness (feature detect, context lost/restored, reduced motion) → Tasks 3, 6.
- Relationship to web-bg (no shared config, local color helpers) → Task 1 (standalone `gl/color.js`, not imported from `web-bg.js`).
