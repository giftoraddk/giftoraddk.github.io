// src/webs/underlay/svc-underlay.js
import { LitElement, html, unsafeCSS } from 'lit';
import styles from './styles/underlay.css?inline';
import { generatePalette, generateHslTints, resolveTint } from './tools/color.js';
import { ticker } from './tools/ticker.js';
import { createQualityController } from './tools/quality.js';
import { VERTEX_SRC, FRAGMENT_SRC, FADE_VERTEX_SRC, FADE_FRAGMENT_SRC, CONCEPTS } from './tools/shaders.js';
import {
    QUALITY_TIERS, AUTO_DENSITY, supportsWebGL, createGL, createProgram,
    STRIDE, buildParticleData, applyBlendMode, destroyGL, createFadeQuad,
} from './tools/context.js';
import { registerDebug, updateFpsBadge } from './fps-badge.js';

const FADE_MS = 350; // must match styles/underlay.css .underlay-canvas transition
const DESTROY_GRACE_MS = 500;
const QUALITY_SAMPLE_MS = 1000;

/**
 * SvcUnderlay - GPU-driven WebGL particle background ('bubbles' | 'stars' | 'dots' | 'leaf' | 'snowflake'),
 * opt-in via `concept` (default '' = off — no WebGL context is ever created, so the
 * common site-wide `bg` usage via getStyleOpts()/bgTemplate() stays pure CSS blob/blur,
 * zero canvas cost, unless a page explicitly sets `concept`).
 * Purely decorative: no conductor/service integration. Multiple instances may exist
 * on a page at once — each lazily creates its own WebGL context on entering the
 * viewport (only while `concept` is set) and fully destroys it (not just pauses) after
 * a fade-out grace period once it leaves, so live context count tracks what's actually
 * on-screen. Motion is computed entirely in the vertex shader from a single time
 * uniform, so per-frame JS cost stays flat regardless of particle count. See
 * docs/superpowers/specs/2026-08-26-underlay-webgl-background-design.md for the full
 * design rationale.
 *
 * Also supports an optional CSS gradient-blob layer (`gradient` + `blobType`
 * 'circleOverlap'|'ellipse') and a `blur` glassmorphism wrapper style, both ported
 * from web-bg-old.js — these render as plain DOM/CSS, independent of the particle
 * system (and work with `concept` off).
 */
export class SvcUnderlay extends LitElement {
    static properties = {
        theme: { type: String },          // sync với data-theme toàn cục, override được — giống web-bg
        tint: { type: String },           // seed màu (hex/rgb) sinh palette hạt
        deg: { type: Number },            // hướng trôi cho bubbles/stars deg=0 → top | 45 → top-right | 90 → right | 135 → bottom-right | 180 → bottom | 225 → bottom-left | 270 → left | 315 → top-left
        concept: { type: String },        // '' (mặc định, tắt WebGL canvas) | 'dots' | 'bubbles' | 'stars' | 'leaf' | 'snowflake'
        density: { type: Number },        // hệ số nhân số hạt so với particleBase của tier hiện tại — bỏ trống (null) để tự chọn theo concept, xem AUTO_DENSITY (tools/context.js)
        limit: { type: Number },          // trần số hạt tuyệt đối, ghi đè density × particleBase nếu nhỏ hơn (0 = không giới hạn) — hữu ích cho bubbles vì hạt to, nhiều hạt dễ rối
        speed: { type: Number },          // hệ số nhân tốc độ chuyển động
        size: { type: String },           // "min~max" px — dải kích thước hạt
        quality: { type: String },        // '' (auto-adaptive) | 'low' | 'medium' | 'high' — set tay sẽ ghim tier và tắt tự điều chỉnh
        fixed: { type: Boolean, reflect: true }, // position:fixed toàn viewport thay vì absolute theo section
        rounded: { type: String },        // border-radius của wrapper
        debug: { type: Boolean },         // bật FPS overlay dùng chung (singleton, đếm tham chiếu qua nhiều instance)
        push: { type: Boolean },          // bật hiệu ứng đẩy hạt ra xa con trỏ (stateless, dùng được cho mọi concept, không riêng dots)
        pushRadius: { type: Number },     // bán kính vùng ảnh hưởng của push, đơn vị CSS px
        pushStrength: { type: Number },   // độ lệch tối đa (CSS px) khi hạt bị đẩy ra xa con trỏ
        trail: { type: Number },          // 0-100, 0 = tắt (mặc định). >0 bật vệt sáng kiểu sao chổi — không clear canvas mỗi frame mà làm mờ dần frame trước theo % này, hạt đang di chuyển sẽ để lại vệt theo đúng hướng deg; càng cao vệt càng dài
        blur: { type: Boolean, reflect: true },   // glassmorphism: backdrop-filter blur + nền kính mờ cho wrapper (port từ web-bg-old.js)
        gradient: { type: Boolean },      // bật lớp gradient blob CSS (circleOverlap/ellipse) vẽ phía sau canvas hạt WebGL — độc lập với hệ hạt
        distance: { type: Number },       // % lan toả blob quanh tâm, dùng cho type='circleOverlap'
        blobType: { type: String },       // 'circleOverlap' | 'ellipse' — kiểu bố cục blob khi gradient=true (mặc định 'circleOverlap')
        total: { type: Number },          // số màu (1-7) — dùng chung cho palette hạt (concept) LẪN blob gradient, seed từ tint/deg đã có sẵn
        colorful: { type: Boolean },      // false (mặc định) = biến thiên độ sáng cùng 1 hue (tonal) | true = dải màu spread nhiều hue quanh tint
        blobMove: { type: String },       // '' (tắt) | 'swap' | 'pulse' — chuyển động cho blob layer khi gradient=true (port từ web-bg-old.js `move`)
    };

    static styles = [unsafeCSS(styles)];

    constructor() {
        super();
        this.theme = '';
        this.tint = '#6d8dff';
        this.deg = 0;
        this.concept = ''; // '' = tắt hoàn toàn WebGL canvas (không init context) — chỉ set 'bubbles'|'stars'|'dots'|'leaf'|'snowflake' mới chạy particle
        this.density = null; // null = chưa set tay → dùng AUTO_DENSITY[this.concept] (xem _rebuildParticles)
        this.limit = 0;
        this.speed = 1;
        this.size = '1~3';
        this.quality = '';
        this.fixed = false;
        this.rounded = '0px';
        this.debug = false;
        this.push = false;
        this.pushRadius = 140;
        this.pushStrength = 46;
        this.trail = 0;
        this.blur = false;
        this.gradient = false;
        this.blobType = 'circleOverlap';
        this.distance = 86;
        this.total = 3;
        this.colorful = false;
        this.blobMove = '';
        this._blobTints = [];

        this._canvas = null;
        this._glCtx = null;
        this._program = null;
        this._buffer = null;
        this._particleCount = 0;
        this._locs = null;
        this._fadeProgram = null;
        this._fadeBuffer = null;
        this._fadeLoc = null;
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
        this._pointerXEased = -9999;
        this._pointerYEased = -9999;
        this._rect = null;
        this._scrollPending = false;

        this._handlePointerMove = this._handlePointerMove.bind(this);
        this._handleScroll = this._handleScroll.bind(this);
        this._handleContextLost = this._handleContextLost.bind(this);
        this._handleContextRestored = this._handleContextRestored.bind(this);
    }

    // Lifecycle init: reduced-motion check, initial quality tier (heuristic from
    // core count, or the pinned `quality` prop), theme sync + observer, and the
    // per-instance IntersectionObserver that drives lazy WebGL init/teardown.
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

    // Tears down every observer/listener/timer and the WebGL context itself —
    // mirrors connectedCallback's setup one-for-one.
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

    // Recomputes the gradient-blob palette BEFORE render() runs in the same
    // cycle (unlike updated(), which fires after render — computing there
    // would leave this render showing last cycle's stale tints). Only runs
    // while gradient is on and something relevant to the blob layer changed;
    // reuses the existing tint/total/colorful props (same color scheme the
    // WebGL particle palette already uses — see generateColorSet).
    willUpdate(changedProperties) {
        if (this.gradient && (changedProperties.has('gradient') || changedProperties.has('tint') ||
            changedProperties.has('total') || changedProperties.has('colorful') || changedProperties.has('theme'))) {
            this._blobTints = generateHslTints(resolveTint(this.tint, this), this.total, this.colorful);
        }
    }

    // Reacts to prop changes: reflects `theme` to the data-theme attribute, hooks
    // up the canvas the first time it's rendered, toggles the debug badge, pins/
    // unpins the quality controller (rebuilding immediately since setManual()
    // changes the tier synchronously), and rebuilds the particle buffer whenever
    // tint/mono/density/concept/theme change — each rebuild also re-adds this
    // instance to the ticker so prefers-reduced-motion users (already dropped
    // from the ticker after their one static frame) actually see the new frame.
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
            if (this._glCtx) {
                this._onResize();
                this._rebuildParticles();
                if (this._visible) ticker.add(this);
            }
        }

        if (changedProperties.has('tint') || changedProperties.has('total') ||
            changedProperties.has('colorful') || changedProperties.has('density') ||
            changedProperties.has('limit') || changedProperties.has('concept') ||
            changedProperties.has('theme')) {
            if (!this.concept) {
                // concept turned off at runtime — fully tear down, no canvas should keep running
                if (this._glCtx) { ticker.remove(this); this._teardownGL(); }
            } else if (!this._glCtx) {
                // concept turned on (or canvas just became ready) — lazily init now
                if (this._canvas && this._visible) this._initGL();
            } else {
                this._rebuildParticles();
                if (this._visible) ticker.add(this);
            }
        }

        if (this._canvas && changedProperties.has('push')) {
            this._syncPointerListener();
        }
    }

    // Mirrors the global data-theme unless an explicit `theme` attribute is set
    // on this element — same pattern as web-bg.js.
    _syncTheme() {
        const globalTheme = document.documentElement.getAttribute('data-theme') || '';
        if (!this.hasAttribute('theme')) this.theme = globalTheme;
    }

    // Visibility lifecycle: entering the viewport lazily creates the WebGL
    // context (if not already alive) and fades the canvas in; leaving fades it
    // out and arms a grace-period timer that only tears the context down if the
    // instance is *still* out of view once the timer fires (a quick scroll-past
    // cancels it via clearTimeout, avoiding needless context churn).
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

    // Attaches the window pointermove/scroll listeners only while this instance
    // is BOTH visible AND has `push` enabled — instances with push off, or
    // off-screen, don't pay for a global listener they don't need. `push`
    // works the same for any concept, not just 'dots'.
    _syncPointerListener() {
        const wantsPointer = this._visible && this.push;
        window.removeEventListener('pointermove', this._handlePointerMove);
        window.removeEventListener('scroll', this._handleScroll, { capture: true });
        if (wantsPointer) {
            window.addEventListener('pointermove', this._handlePointerMove);
            window.addEventListener('scroll', this._handleScroll, { passive: true, capture: true });
            this._rect = this._canvas?.getBoundingClientRect() ?? null;
        }
    }

    // Converts the pointer's page coordinates into canvas-space device pixels,
    // consumed each frame by the push-effect proximity uniform (any concept).
    // Must use this._dpr (the tier-capped ratio the canvas was actually sized
    // with, see _resize()) rather than the raw window.devicePixelRatio — on a
    // HiDPI screen with a capped tier (e.g. quality 'low' -> dprCap 1), the
    // canvas's pixel space is smaller than window.devicePixelRatio implies,
    // so using the raw ratio here scales the pointer into the wrong space and
    // the push effect visibly drifts away from the cursor.
    _handlePointerMove(e) {
        if (!this._rect) return;
        const dpr = this._dpr || 1;
        this._pointerX = (e.clientX - this._rect.left) * dpr;
        this._pointerY = (e.clientY - this._rect.top) * dpr;
    }

    // rAF-throttled refresh of the canvas's bounding rect on scroll — avoids a
    // synchronous layout read on every scroll event.
    _handleScroll() {
        if (this._scrollPending || !this._canvas) return;
        this._scrollPending = true;
        requestAnimationFrame(() => {
            this._scrollPending = false;
            if (this._canvas) this._rect = this._canvas.getBoundingClientRect();
        });
    }

    // Browser-driven context loss (driver reset, resource pressure, etc.) —
    // stop ticking and drop GL references; _handleContextRestored re-inits.
    _handleContextLost(e) {
        e.preventDefault();
        ticker.remove(this);
        this._glCtx = null;
        this._program = null;
        this._buffer = null;
    }

    // Fires once the browser restores a previously-lost context; only relevant
    // if this instance is still visible (otherwise the next _onIntersect(true)
    // will init it).
    _handleContextRestored() {
        if (this._visible) this._initGL();
    }

    // Lazily creates this instance's WebGL context, program, uniform/attribute
    // locations, and particle buffer. No-op if a context is already alive
    // (re-entrancy guard) or WebGL isn't supported.
    _initGL() {
        if (this._glCtx) return;
        if (!this.concept) return; // concept off → purely decorative blob/blur layer, no canvas at all
        if (!supportsWebGL() || !this._canvas) return;
        const created = createGL(this._canvas);
        if (!created) return;
        const { gl } = created;
        try {
            this._program = createProgram(gl, VERTEX_SRC, FRAGMENT_SRC);
        } catch (err) {
            console.error('[svc-underlay] particle shader failed to compile/link:', err);
            this._program = null;
            destroyGL(gl);
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
            u_pushEnabled: gl.getUniformLocation(this._program, 'u_pushEnabled'),
            u_pushRadius: gl.getUniformLocation(this._program, 'u_pushRadius'),
            u_pushStrength: gl.getUniformLocation(this._program, 'u_pushStrength'),
        };
        this._buffer = gl.createBuffer();
        applyBlendMode(gl);

        // Best-effort: the trail/comet fade pass (see _tick) needs its own
        // tiny program+buffer. If it somehow fails to compile, trail just
        // silently falls back to a hard clear each frame — it's a secondary
        // visual feature, not worth failing the whole component over.
        try {
            this._fadeProgram = createProgram(gl, FADE_VERTEX_SRC, FADE_FRAGMENT_SRC);
            this._fadeBuffer = createFadeQuad(gl);
            this._fadeLoc = gl.getAttribLocation(this._fadeProgram, 'a_pos');
        } catch {
            this._fadeProgram = null;
            this._fadeBuffer = null;
        }

        this._ro = new ResizeObserver(() => this._onResize());
        this._ro.observe(this);
        this._onResize();
        this._rebuildParticles();
        if (this._visible) ticker.add(this);
    }

    // Destroys the GL context/program/buffer and swaps in a fresh canvas (see
    // comment below for why) so the instance can cleanly re-acquire a context
    // via a later _initGL() call.
    _teardownGL() {
        this._ro?.disconnect();
        this._ro = null;
        if (this._glCtx) {
            if (this._buffer) this._glCtx.deleteBuffer(this._buffer);
            if (this._program) this._glCtx.deleteProgram(this._program);
            if (this._fadeBuffer) this._glCtx.deleteBuffer(this._fadeBuffer);
            if (this._fadeProgram) this._glCtx.deleteProgram(this._fadeProgram);
            destroyGL(this._glCtx);
        }
        this._glCtx = null;
        this._program = null;
        this._buffer = null;
        this._locs = null;
        this._fadeProgram = null;
        this._fadeBuffer = null;
        this._fadeLoc = null;

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

    // Resizes the canvas's backing store to its CSS size × the active quality
    // tier's capped devicePixelRatio, and updates the GL viewport to match.
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
        // Reassigning canvas.width/height reallocates the backing store with
        // UNDEFINED contents — matters once _tick() can skip its own clear
        // (trail mode), since without this a resize would flash garbage.
        this._glCtx.clearColor(0, 0, 0, 0);
        this._glCtx.clear(this._glCtx.COLOR_BUFFER_BIT);
    }

    // Parses the "min~max" `size` prop into a [min, max] px pair, falling back
    // to [1, 3] for an unset or malformed value.
    _comSizeRange() {
        const parts = (this.size || '').split('~').map(Number);
        if (parts.length === 2 && parts.every(Number.isFinite)) return parts;
        return [1, 3];
    }

    // Regenerates the particle buffer at a count derived from the active
    // quality tier's particleBase × density, capped by `limit` if set (>0),
    // with a fresh per-particle palette from the current tint/total/colorful.
    // Also re-applies the (theme-independent) screen blend mode.
    _rebuildParticles() {
        const gl = this._glCtx;
        if (!gl) return;
        const tier = QUALITY_TIERS[this._qualityCtl.tier];
        const effectiveDensity = this.density ?? AUTO_DENSITY[this.concept] ?? 1;
        let count = Math.max(8, Math.min(2000, Math.round(tier.particleBase * effectiveDensity)));
        if (this.limit > 0) count = Math.min(count, this.limit);
        const palette = generatePalette(resolveTint(this.tint, this), this.total, this.colorful, count);
        const data = buildParticleData(count, palette);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        this._particleCount = count;
        applyBlendMode(gl);
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

        // Ease the pointer uniform toward its raw position (O(1) — two numbers,
        // not one per particle) so the push repel field has a touch of
        // catch-up lag instead of teleporting instantly with the cursor. A big
        // jump (first move after being off-screen, or a fast teleport) snaps
        // instead of animating, so it doesn't visibly sweep across the canvas.
        if (this.push) {
            const dxp = this._pointerX - this._pointerXEased;
            const dyp = this._pointerY - this._pointerYEased;
            if (Math.abs(dxp) > 400 || Math.abs(dyp) > 400) {
                this._pointerXEased = this._pointerX;
                this._pointerYEased = this._pointerY;
            } else {
                this._pointerXEased += dxp * 0.2;
                this._pointerYEased += dyp * 0.2;
            }
        }

        const time = this._prefersReducedMotion ? 0 : now;
        const [sizeMin, sizeMax] = this._comSizeRange();
        const stride = STRIDE * 4; // bytes

        if (this.trail > 0 && this._fadeProgram && this._fadeBuffer) {
            // Comet/trail mode: instead of erasing the previous frame, keep a
            // fraction of it each frame (trail/100, capped at 0.95 so it always
            // eventually fades rather than smearing forever). A moving
            // particle then leaves a streak behind it that dissolves over a
            // few frames — including the particle's own fade-to-invisible
            // near its wrap point, so the trail disappears right along with
            // it rather than lingering after the head is gone.
            const keepFactor = Math.min(0.95, Math.max(0, this.trail) / 100 * 0.95);
            gl.blendFunc(gl.ZERO, gl.CONSTANT_ALPHA);
            gl.blendColor(0, 0, 0, keepFactor);
            gl.useProgram(this._fadeProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._fadeBuffer);
            gl.enableVertexAttribArray(this._fadeLoc);
            gl.vertexAttribPointer(this._fadeLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            applyBlendMode(gl); // restore the particles' own screen blend mode
        } else {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

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
        gl.uniform2f(this._locs.u_pointer, this._pointerXEased, this._pointerYEased);
        gl.uniform1f(this._locs.u_glow, QUALITY_TIERS[this._qualityCtl.tier].glow ? 1 : 0);
        gl.uniform1f(this._locs.u_pushEnabled, this.push ? 1 : 0);
        gl.uniform1f(this._locs.u_pushRadius, this.pushRadius || 140);
        gl.uniform1f(this._locs.u_pushStrength, this.pushStrength || 46);

        gl.drawArrays(gl.POINTS, 0, this._particleCount);

        return !this._prefersReducedMotion;
    }

    // Blob positions (%) for the 'circleOverlap' layout — ported from
    // web-bg-old.js's _comBlobPositions: blobs fan out from `deg` clustered
    // within a `spread` arc, `distance`% out from center.
    _comBlobPositions(total) {
        const spread = 22;
        const off = -((total - 1) * spread) / 2;
        const positions = [];
        for (let i = 0; i < total; i++) {
            const angle = (this.deg || 0) + off + i * spread - 90;
            const rad = angle * Math.PI / 180;
            positions.push({
                x: 50 + Math.cos(rad) * this.distance,
                y: 50 + Math.sin(rad) * this.distance,
            });
        }
        return positions;
    }

    // CSS linear-gradient color-stop string for the 'ellipse' layout — ported
    // from web-bg-old.js's inline ellipse gradient-building logic.
    _comEllipseGradient() {
        const tints = this._blobTints;
        const len = tints.length;
        const parts = [];
        if (len === 1) {
            const c = tints[0];
            parts.push(`hsla(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%, 0) 25%`);
            parts.push(`hsla(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%, 0.26) 50%`);
            parts.push(`hsla(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%, 0) 75%`);
        } else {
            const first = tints[0], last = tints[len - 1];
            parts.push(`hsla(${Math.round(first.h)}, ${Math.round(first.s)}%, ${Math.round(first.l)}%, 0) 5%`);
            const stp = 60 / (len - 1);
            tints.forEach((c, i) => {
                parts.push(`hsla(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%, 0.26) ${(20 + i * stp).toFixed(2)}%`);
            });
            parts.push(`hsla(${Math.round(last.h)}, ${Math.round(last.s)}%, ${Math.round(last.l)}%, 0) 95%`);
        }
        return parts.join(', ');
    }

    // Normalises `blobMove`: '' / 'false' → off, legacy boolean true/'true' → 'swap',
    // else passthrough ('swap' | 'pulse'). Ported from web-bg-old.js's `_moveMode`.
    get _comMoveMode() {
        if (!this.blobMove || this.blobMove === 'false') return '';
        if (this.blobMove === true || this.blobMove === 'true') return 'swap';
        return this.blobMove;
    }

    // @keyframes CSS string for the current blobMove mode — ported from web-bg-old.js's
    // _comMoveStyles, minus the --tx/--ty parallax terms (svc-underlay blobs don't track
    // pointer parallax, unlike web-bg-old.js's) so the base transform is just centering.
    // swap  — 'circleOverlap': one keyframe per blob, animating toward the next blob's
    //         position (delta offsets from `positions`); 'ellipse': one shared small sway.
    // pulse — single shared opacity keyframe; stagger applied per-blob in _comAnimStyle.
    _comMoveStyles(positions) {
        const mode = this._comMoveMode;
        if (!mode) return '';
        const isEllipse = this.blobType === 'ellipse';

        if (mode === 'swap') {
            if (isEllipse) return `@keyframes _ul_sw_e{0%,100%{transform:translate(0,0)}50%{transform:translate(5%,3%)}}`;
            const n = positions.length;
            return positions.map((p, i) => {
                const t = positions[(i + 1) % n];
                const dx = (t.x - p.x).toFixed(2);
                const dy = (t.y - p.y).toFixed(2);
                return `@keyframes _ul_sw_${i}{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(calc(-50% + ${dx}%),calc(-50% + ${dy}%))}}`;
            }).join('');
        }

        if (isEllipse) return `@keyframes _ul_pu_e{0%,100%{opacity:1}50%{opacity:0.05}}`;
        return `@keyframes _ul_pu{0%,100%{opacity:var(--bg-blob-opacity,0.5)}50%{opacity:0.02}}`;
    }

    // Inline animation style for blob i of n — swap: unique per-blob keyframe, no stagger
    // (each blob already has its own trajectory); pulse: shared keyframe + staggered delay
    // so blobs breathe out of phase. '' (no animation) when blobMove is off.
    _comAnimStyle(i, n) {
        const mode = this._comMoveMode;
        if (!mode) return '';
        const isEllipse = this.blobType === 'ellipse';

        if (mode === 'swap') {
            return isEllipse ? 'animation:_ul_sw_e 6s ease-in-out infinite;' : `animation:_ul_sw_${i} 5s ease-in-out infinite;`;
        }
        const dur = 4;
        if (isEllipse) return `animation:_ul_pu_e ${dur}s ease-in-out infinite;`;
        return `animation:_ul_pu ${dur}s ease-in-out infinite;animation-delay:${(i * dur / Math.max(n, 1)).toFixed(2)}s;`;
    }

    // Renders the gradient-blob layer (circleOverlap or ellipse) behind the
    // particle canvas when `gradient` is on — '' when off, so it costs
    // nothing (no extra DOM nodes) for the common WebGL-only case.
    _rbBlobs() {
        if (!this.gradient || !this._blobTints.length) return '';
        const isEllipse = this.blobType === 'ellipse';
        const positions = isEllipse ? [] : this._comBlobPositions(this._blobTints.length);
        const moveStyles = this._comMoveStyles(positions);
        if (isEllipse) {
            return html`
                ${moveStyles ? html`<style>${moveStyles}</style>` : ''}
                <div class="blob-ellipse" style="background:linear-gradient(${this.deg || 0}deg, ${this._comEllipseGradient()});${this._comAnimStyle(0, 1)}"></div>
            `;
        }
        return html`
            ${moveStyles ? html`<style>${moveStyles}</style>` : ''}
            ${this._blobTints.map((c, i) => html`
                <div class="blob" style="background:hsl(${Math.round(c.h)},${Math.round(c.s)}%,${Math.round(c.l)}%);left:${positions[i].x}%;top:${positions[i].y}%;${this._comAnimStyle(i, this._blobTints.length)}"></div>
            `)}
        `;
    }

    render() {
        return html`
            <div class="underlay-wrapper" style="border-radius:${this.rounded};">
                ${this._rbBlobs()}
                ${this.concept ? html`<canvas class="underlay-canvas"></canvas>` : ''}
            </div>
        `;
    }
}

if (!customElements.get('svc-underlay')) {
    customElements.define('svc-underlay', SvcUnderlay);
}

// Config object (getStyleOpts() output, xem docs/DESIGN.rst) → <svc-underlay> template — dùng
// chung bởi web-boxs.js (bg mỗi tier/card) và web-board.js (bg cấp section), thay cho web-bg.js
// trước đây. Chỉ forward các field getStyleOpts thực sự tạo ra (blur/gradient/blobType/total/
// colorful/distance/deg/tint/rounded/fixed) — concept/density/speed/size/push/trail… giữ nguyên
// default riêng của svc-underlay vì getStyleOpts không cấu hình các field đó. `blobMove` không
// phải param của getStyleOpts (chỉ set tay thêm vào object bg) nhưng vẫn forward ở đây để
// section config có thể bật chuyển động cho blob layer khi cần.
export function bgTemplate(bg) {
    if (!bg || !Object.keys(bg).length) return '';
    return html`
      <svc-underlay
        .tint=${bg.tint}
        .rounded=${bg.rounded || '0px'}
        .blobType=${bg.blobType || 'circleOverlap'}
        .total=${bg.total || 3}
        .deg=${bg.deg || 0}
        .distance=${bg.distance || 86}
        .blobMove=${bg.blobMove || ''}
        ?blur=${bg.blur}
        ?gradient=${bg.gradient}
        ?fixed=${bg.fixed}
        ?colorful=${bg.colorful}
      ></svc-underlay>
    `;
}

export default SvcUnderlay;
