import { LitElement, html, unsafeCSS } from "lit";
import sliderStyles from "./styles/web-slider.css?inline";

const BREAKPOINT_TABLET = 769;
const BREAKPOINT_DESKTOP = 1025;

// Shortest signed distance from `pos` to slide index `i`, wrapped modulo N,
// within the window centered at `center` (default 0 — shortest-path animation).
// This is what lets loop mode work without ever cloning a DOM node: each slide
// always renders at the nearest wrap-around offset to the current position.
function wrapDelta(delta, n, center = 0) {
  if (!n) return delta;
  return delta - n * Math.round((delta - center) / n);
}

function computePerView(configured, viewportWidth) {
  const p = Number(configured) || 1;
  if (p === 1) return 1;
  if (viewportWidth >= BREAKPOINT_DESKTOP) return p;
  if (viewportWidth >= BREAKPOINT_TABLET) return 2;
  return p > 2 ? 2 : 1;
}

const EASE_DURATION = 320; // ms — programmatic goto()/next()/prev() animation
const FRICTION_PER_MS = 0.9982; // exponential velocity decay per ms of momentum
const MOMENTUM_STOP = 0.00015; // pos-units/ms below which momentum is considered settled
const DRAG_THRESHOLD = 6; // px of pointer movement before a gesture counts as a drag
const MARQUEE_MIN_DURATION_MS = 5000; // floor for the configured autoplay duration used as marquee cycle time
const MARQUEE_SLIDES_PER_CYCLE = 5; // slides advanced per cycle — matches the old marquee pacing
const AUTOPLAY_DEFAULT_MS = 3000; // default interval when autoplay is truthy but not a usable number
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// SliderTrack — self-contained drag/position engine. No Lit or DOM-library dependency,
// so it can be unit-reasoned-about independently of the web component around it.
class SliderTrack {
  constructor(container, getSlides, opts, callbacks) {
    this.container = container;
    this.getSlides = getSlides; // () => HTMLElement[]
    this.opts = opts;
    this.callbacks = callbacks; // { onSettle({current,count}) }

    this.pos = 0;
    this.current = 0;
    this.count = 0;
    this.perView = 1;
    this.slideSize = 0;
    this.containerSize = 0;

    this._pointerId = null;
    this._draggedPastThreshold = false;
    this._dragStartClient = 0;
    this._dragStartPos = 0;
    this._samples = [];
    this._velocity = 0;

    this._animRAF = null;
    this._animFrom = 0;
    this._animTo = 0;
    this._animStart = 0;

    this._momentumRAF = null;
    this._momentumLastT = 0;

    this._marqueeRAF = null;
    this._marqueeLastT = 0;

    this._autoplayTimer = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._tickMomentum = this._tickMomentum.bind(this);
    this._tickMarquee = this._tickMarquee.bind(this);
    this._tickEase = this._tickEase.bind(this);
    this._onMq = () => this._measure();
    this._onDragStart = (e) => e.preventDefault();

    this._resizeObserver = new ResizeObserver(() => this._measure());
    this._resizeObserver.observe(container);
    this._mqTablet = matchMedia(`(min-width: ${BREAKPOINT_TABLET}px)`);
    this._mqDesktop = matchMedia(`(min-width: ${BREAKPOINT_DESKTOP}px)`);
    this._mqTablet.addEventListener("change", this._onMq);
    this._mqDesktop.addEventListener("change", this._onMq);

    if (this.opts.drag) container.addEventListener("pointerdown", this._onPointerDown);
    // Prevent the browser's native HTML5 image-drag from hijacking pointer-drag
    // gestures when the user grabs directly on an <img> inside a slide/slotted card.
    container.addEventListener("dragstart", this._onDragStart);

    this._measure();
    if (this.opts.marquee) this._startMarquee();
  }

  destroy() {
    if (this._pointerId !== null && this._draggedPastThreshold) this.container.releasePointerCapture?.(this._pointerId);
    this._resizeObserver.disconnect();
    this._mqTablet.removeEventListener("change", this._onMq);
    this._mqDesktop.removeEventListener("change", this._onMq);
    this.container.removeEventListener("pointerdown", this._onPointerDown);
    this.container.removeEventListener("dragstart", this._onDragStart);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("pointercancel", this._onPointerUp);
    cancelAnimationFrame(this._animRAF);
    cancelAnimationFrame(this._momentumRAF);
    cancelAnimationFrame(this._marqueeRAF);
    clearTimeout(this._autoplayTimer);
  }

  // ---- measurement ---------------------------------------------------------

  _measure() {
    const rect = this.container.getBoundingClientRect();
    this.containerSize = this.opts.vertical ? rect.height : rect.width;
    const configuredPerView = this.opts.effect === "fade" ? 1 : this.opts.slides;
    this.perView = computePerView(configuredPerView, window.innerWidth);
    const spacing = Number(this.opts.spacing) || 0;
    this.slideSize = Math.max(0, (this.containerSize - spacing * (this.perView - 1)) / this.perView);

    const slides = this.getSlides();
    this.count = slides.length;
    slides.forEach((el) => {
      el.style.gridArea = "1 / 1";
      if (this.opts.vertical) { el.style.height = `${this.slideSize}px`; el.style.width = ""; }
      else { el.style.width = `${this.slideSize}px`; el.style.height = ""; }
    });

    if (!Number.isFinite(this.pos)) this.pos = 0;
    this._clampNonLoop();
    this._applyTransforms();
    if (!this._animRAF && !this._momentumRAF && this._pointerId === null) {
      this._settle();
    }
  }

  refreshSlides() {
    this._measure();
  }

  // ---- position application -------------------------------------------------

  _clampNonLoop() {
    if (this.opts.loop) return;
    const maxPos = Math.max(0, this.count - this.perView);
    this.pos = Math.min(Math.max(this.pos, 0), maxPos);
  }

  _clampTarget(target) {
    if (this.opts.loop) return target;
    const maxPos = Math.max(0, this.count - this.perView);
    return Math.min(Math.max(target, 0), maxPos);
  }

  _applyTransforms() {
    const slides = this.getSlides();
    const n = slides.length;
    if (!n) return;
    const step = this.slideSize + (Number(this.opts.spacing) || 0);
    const originPx = this.opts.origin === "center" ? (this.containerSize - this.slideSize) / 2 : 0;
    const isFade = this.opts.effect === "fade";

    slides.forEach((el, i) => {
      const raw = i - this.pos;
      const d = this.opts.loop ? wrapDelta(raw, n, (this.perView - 1) / 2) : raw;
      if (isFade) {
        el.style.transform = "";
        el.style.opacity = String(Math.max(0, 1 - Math.abs(d)));
        el.style.pointerEvents = Math.abs(d) < 0.5 ? "" : "none";
      } else {
        const px = originPx + d * step;
        el.style.transform = this.opts.vertical ? `translate3d(0, ${px}px, 0)` : `translate3d(${px}px, 0, 0)`;
        el.style.opacity = "";
        el.style.pointerEvents = "";
      }
    });
  }

  _settle(reschedule = true) {
    const n = this.count;
    const rounded = Math.round(this.pos);
    this.current = n ? ((rounded % n) + n) % n : 0;
    this.callbacks.onSettle?.({ current: this.current, count: n });
    if (reschedule && !this.opts.marquee) this._scheduleAutoplay();
  }

  // ---- programmatic navigation ----------------------------------------------

  goto(target, animate = true) {
    clearTimeout(this._autoplayTimer);
    cancelAnimationFrame(this._animRAF);
    this._animRAF = null;
    cancelAnimationFrame(this._momentumRAF);
    this._momentumRAF = null;
    cancelAnimationFrame(this._marqueeRAF);
    this._marqueeRAF = null;
    const n = this.count;
    let delta = target - this.pos;
    if (this.opts.loop) delta = wrapDelta(delta, n);
    const to = this.opts.loop ? this.pos + delta : this._clampTarget(this.pos + delta);
    if (!animate) {
      this.pos = to;
      this._applyTransforms();
      this._settle();
      if (this.opts.marquee) this._startMarquee();
      return;
    }
    this._animateTo(to);
  }

  next(animate = true) { this.goto(this.pos + 1, animate); }
  prev(animate = true) { this.goto(this.pos - 1, animate); }

  _animateTo(to) {
    cancelAnimationFrame(this._animRAF);
    this._animFrom = this.pos;
    this._animTo = to;
    this._animStart = performance.now();
    this._animRAF = requestAnimationFrame(this._tickEase);
  }

  _tickEase(now) {
    const t = Math.min(1, (now - this._animStart) / EASE_DURATION);
    this.pos = this._animFrom + (this._animTo - this._animFrom) * easeOutCubic(t);
    this._applyTransforms();
    if (t < 1) {
      this._animRAF = requestAnimationFrame(this._tickEase);
    } else {
      this._animRAF = null;
      this.pos = this._animTo;
      this._applyTransforms();
      this._settle();
      if (this.opts.marquee) this._startMarquee();
    }
  }

  // ---- pointer drag -----------------------------------------------------------

  _onPointerDown(e) {
    if (this._pointerId !== null) return;
    cancelAnimationFrame(this._animRAF);
    cancelAnimationFrame(this._momentumRAF);
    this._animRAF = null;
    this._momentumRAF = null;
    this._pointerId = e.pointerId;
    this._draggedPastThreshold = false;
    this._dragStartClient = this.opts.vertical ? e.clientY : e.clientX;
    this._dragStartPos = this.pos;
    this._samples = [{ t: performance.now(), pos: this.pos }];
    clearTimeout(this._autoplayTimer);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("pointercancel", this._onPointerUp);
  }

  _onPointerMove(e) {
    if (e.pointerId !== this._pointerId) return;
    const client = this.opts.vertical ? e.clientY : e.clientX;
    const rawDelta = client - this._dragStartClient;
    if (!this._draggedPastThreshold) {
      if (Math.abs(rawDelta) < DRAG_THRESHOLD) return;
      this._draggedPastThreshold = true;
      this.container.setPointerCapture?.(this._pointerId);
    }
    e.preventDefault();
    const step = this.slideSize + (Number(this.opts.spacing) || 0);
    if (step <= 0) return;
    this.pos = this._dragStartPos - rawDelta / step;
    if (!this.opts.loop) this._clampNonLoop();
    this._applyTransforms();
    const now = performance.now();
    this._samples.push({ t: now, pos: this.pos });
    while (this._samples.length > 5) this._samples.shift();
  }

  _onPointerUp(e) {
    if (e.pointerId !== this._pointerId) return;
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("pointercancel", this._onPointerUp);
    // Only release capture if a drag actually set it (see _onPointerMove) — calling
    // releasePointerCapture on an id that never captured is a no-op in most engines,
    // but skipping it entirely avoids relying on that.
    if (this._draggedPastThreshold) this.container.releasePointerCapture?.(this._pointerId);
    this._pointerId = null;

    if (!this._draggedPastThreshold) {
      this._scheduleAutoplay();
      return; // tap, not a drag — let the underlying click pass through untouched
    }

    const first = this._samples[0];
    const last = this._samples[this._samples.length - 1];
    const dt = last.t - first.t;
    this._velocity = dt > 0 ? (last.pos - first.pos) / dt : 0;

    if (this.opts.mode === "snap") {
      this._animateTo(this._clampTarget(Math.round(this.pos)));
    } else {
      this._startMomentum();
    }
  }

  // ---- momentum (free / free-snap) -------------------------------------------

  _startMomentum() {
    this._momentumLastT = performance.now();
    this._momentumRAF = requestAnimationFrame(this._tickMomentum);
  }

  _tickMomentum(now) {
    const dt = now - this._momentumLastT;
    this._momentumLastT = now;
    this._velocity *= Math.pow(FRICTION_PER_MS, dt);
    this.pos += this._velocity * dt;
    if (!this.opts.loop) {
      const maxPos = Math.max(0, this.count - this.perView);
      if (this.pos < 0) { this.pos = 0; this._velocity = 0; }
      if (this.pos > maxPos) { this.pos = maxPos; this._velocity = 0; }
    }
    this._applyTransforms();

    if (Math.abs(this._velocity) > MOMENTUM_STOP) {
      this._momentumRAF = requestAnimationFrame(this._tickMomentum);
      return;
    }
    this._momentumRAF = null;
    if (this.opts.mode === "free-snap") {
      this._animateTo(this._clampTarget(Math.round(this.pos)));
    } else {
      this._settle();
    }
  }

  // ---- marquee ------------------------------------------------------------------

  _startMarquee() {
    this._marqueeLastT = performance.now();
    this._marqueeRAF = requestAnimationFrame(this._tickMarquee);
  }

  _tickMarquee(now) {
    const dt = now - this._marqueeLastT;
    this._marqueeLastT = now;
    const duration = Math.max(Number(this.opts.autoplay) || 0, MARQUEE_MIN_DURATION_MS);
    const speed = MARQUEE_SLIDES_PER_CYCLE / duration; // slides per ms — matches the old marquee pacing
    const dir = this.opts.reverse ? -1 : 1;
    this.pos += dir * speed * dt;
    this._applyTransforms();
    const n = this.count;
    const prevCurrent = this.current;
    this.current = n ? (((Math.round(this.pos) % n) + n) % n) : 0;
    if (this.current !== prevCurrent) {
      this.callbacks.onSettle?.({ current: this.current, count: n });
    }
    this._marqueeRAF = requestAnimationFrame(this._tickMarquee);
  }

  // ---- autoplay -------------------------------------------------------------------

  _scheduleAutoplay() {
    clearTimeout(this._autoplayTimer);
    if (!this.opts.autoplay || this.opts.marquee || this._pointerId !== null) return;
    const interval = Number(this.opts.autoplay) > 1 ? Number(this.opts.autoplay) : AUTOPLAY_DEFAULT_MS;
    this._autoplayTimer = setTimeout(() => {
      this.goto(this.pos + (this.opts.reverse ? -1 : 1), true);
    }, interval);
  }
}

export class WebSlider extends LitElement {
  static properties = {
    images:   { type: Array },   // Array<string> — render slides from URL array in shadow DOM (bypasses slot)
    autoplay: { type: Number },  // ms interval; ignored when marquee=true
    reverse:  { type: Boolean }, // autoplay ngược chiều (prev thay vì next)
    marquee:  { type: Boolean }, // true → chuyển thành băng chạy liên tục (loop+drag=false)
    loop:     { type: Boolean },
    mode:     { type: String },  // snap | free | free-snap
    vertical: { type: Boolean, reflect: true },
    slides:   { type: Number },  // số slide hiển thị đồng thời; default 1
    spacing:  { type: Number },  // px khoảng cách giữa slides; default 0
    nav:      { type: Boolean }, // hiện nút prev/next
    dots:     { type: Boolean }, // hiện dot indicators
    lazy:     { type: Boolean }, // lazy-load img[data-src]
    effect:   { type: String },  // '' | 'fade' — transition effect
    origin:   { type: String },  // auto | center — vị trí neo của slide
    current:  { type: Number, state: true },
    count:    { type: Number, state: true },
    ui:         { type: String },  // modern | spatial
    justify:    { type: String },  // between | center | end — căn controls khi chỉ có nav hoặc dots
    placement:  { type: String },  // bottom — vị trí controls
    blur:       { type: Boolean }, // blur bg behind each image (fills letterbox when ratio differs)
    maxHeight:  { type: String },  // CSS value e.g. '400px' — caps height, centers slides vertically
    theme:      { type: String },
    mainColors: { type: String },  // pipe-separated 5 colors
    textColor:  { type: String },
  };

  static get uiConfigs() {
    return {
      modern: {
        wrap: 'modern web-slider-track',
        btn:  'web-slider-btn',
        dot:  'web-slider-dot',
      },
      spatial: {
        wrap: 'spatial web-slider-track',
        btn:  'spatial web-slider-btn',
        dot:  'spatial web-slider-dot',
      },
    };
  }

  static styles = [unsafeCSS(sliderStyles)];

  constructor() {
    super();
    this.images    = null;
    this.autoplay  = 0;
    this.loop      = false;
    this.mode      = "free-snap";
    this.vertical  = false;
    this.slides    = 1;
    this.spacing   = 0;
    this.nav       = false;
    this.dots      = false;
    this.lazy      = false;
    this.effect    = '';
    this.origin    = "auto";
    this.reverse   = false;
    this.current   = 0;
    this.count     = 0;
    this.ui         = "modern";
    this._track     = null;
    this.justify    = '';
    this.placement  = '';
    this.blur       = false;
    this.maxHeight  = '';
    this.marquee    = false;
    this.theme      = '';
    this.mainColors = '';
    this.textColor  = '';
  }

  get _colors() {
    const [primary = '', secondary = '', accent = '', info = '', warning = '']
        = (this.mainColors || '').split('|').map(c => c.trim())
    return { primary, secondary, accent, info, warning }
  }

  _applyCSS() {
    this.theme
        ? this.setAttribute('data-theme', this.theme)
        : this.removeAttribute('data-theme')
    const c = this._colors
    const vars = {
      '--color-primary':      c.primary,
      '--color-secondary':    c.secondary,
      '--color-accent':       c.accent,
      '--color-info':         c.info,
      '--color-warning':      c.warning,
      '--color-base-content': this.textColor,
    }
    for (const [k, v] of Object.entries(vars)) {
      v ? this.style.setProperty(k, v) : this.style.removeProperty(k)
    }
  }

  firstUpdated() {
    if (this._imagesMode) {
      if (this.images.length > 0) this.style.display = "flex";
    } else {
      this.style.display = "flex";
    }
    this.initSlider();
  }

  updated(changed) {
    if (changed.has('theme') || changed.has('mainColors')
        || changed.has('textColor')) {
      this._applyCSS()
    }
    const reinitKeys = ["loop","mode","vertical","slides","spacing","effect","origin","images","reverse","marquee","autoplay"];
    if (reinitKeys.some(k => changed.has(k)) && this._track) {
      this._track.destroy();
      this._track = null;
      this.initSlider();
    }
  }

  // Returns true if using the images-attribute mode (slides in shadow DOM)
  get _imagesMode() {
    return Array.isArray(this.images) && this.images.length > 0;
  }

  _getSlideEls = () => {
    const container = this.shadowRoot?.getElementById("slider");
    if (!container) return [];
    if (this._imagesMode) return Array.from(container.querySelectorAll(".web-slider-slide"));
    const slot = container.querySelector("slot");
    if (!slot) return [];
    return slot.assignedElements();
  };

  initSlider() {
    const container = this.shadowRoot.getElementById("slider");
    if (!container) return;
    if (this._track) { this._track.destroy(); this._track = null; }

    try {
      this._track = new SliderTrack(container, this._getSlideEls, {
        loop:     this.marquee ? true : this.loop,
        drag:     !this.marquee,
        mode:     this.effect === 'fade' ? 'snap' : (this.mode || "free-snap"),
        vertical: this.vertical,
        slides:   Number(this.slides) || 1,
        spacing:  Number(this.spacing) || 0,
        origin:   this.origin,
        effect:   this.effect,
        marquee:  this.marquee,
        autoplay: this.autoplay,
        reverse:  this.reverse,
      }, {
        onSettle: ({ current, count }) => {
          this.current = current;
          this.count = count;
          this._syncLazy();
        },
      });
    } catch (e) {
      console.warn("SliderTrack initialization failed:", e);
    }
  }

  _handleSlotChange() {
    if (this._imagesMode) return; // slot not used in images mode
    if (this._track) {
      requestAnimationFrame(() => this._track?.refreshSlides());
    } else {
      this.initSlider();
    }
  }

  // Public JS API — see hook/web-apex.rst
  next() { this._track?.next(); }
  prev() { this._track?.prev(); }
  goto(index) { this._track?.goto(index, true); }

  _syncLazy() {
    if (!this.lazy) return;
    const slides = this._getSlideEls();
    const n = slides.length;
    if (!n) return;
    const rel = this.current;
    const indices = [rel];
    if (this.loop) {
      indices.push((rel - 1 + n) % n, (rel + 1) % n);
    } else {
      if (rel > 0) indices.push(rel - 1);
      if (rel < n - 1) indices.push(rel + 1);
    }
    indices.forEach((i) => {
      slides[i]?.querySelectorAll("img[data-src]").forEach((img) => {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      });
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._track?.destroy();
  }

  render() {
    const hasBoth      = this.nav && this.dots;
    const controlsClass = (hasBoth ? "between" : this.justify || "end") + ` ${this.placement}`;
    const uiConfig      = this.constructor.uiConfigs[this.ui || "modern"];
    const maxH         = this.maxHeight;

    return html`
      <div class="web-slider">
        <div
          class="${uiConfig.wrap}${maxH ? ' h-auto' : ''}"
          id="slider"
          style="${maxH ? `max-height:${maxH};--slider-max-h:${maxH}` : ''}"
          ?data-vertical=${this.vertical}
        >
          ${this._imagesMode
            ? this.images.map((src) =>
                this.blur
                  ? html`<div class="web-slider-slide img-slide blur-slide">
                           <div class="blur-bg" style="background-image:url(${src})"></div>
                           <img src="${src}" alt="" />
                         </div>`
                  : html`<div class="web-slider-slide img-slide">
                           <img src="${src}" alt="" />
                         </div>`
              )
            : html`<slot @slotchange=${this._handleSlotChange}></slot>`}
        </div>

        ${this.nav || this.dots
          ? html`
              <div class="web-slider-controls ${controlsClass}">
                ${this.dots
                  ? html`
                      <div class="web-slider-dots">
                        ${Array.from({ length: this.count }).map(
                          (_, i) => html`
                            <div
                              class="${uiConfig.dot} ${this.current === i ? "active" : ""}"
                              @click=${() => this.goto(i)}
                            ></div>`
                        )}
                      </div>`
                  : ""}
                ${this.nav
                  ? html`
                      <div class="web-slider-nav">
                        <button class="${uiConfig.btn}" @click=${() => this.prev()}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>
                        <button class="${uiConfig.btn}" @click=${() => this.next()}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </div>`
                  : ""}
              </div>`
          : ""}
      </div>
    `;
  }
}

if (!customElements.get("web-slider")) {
  customElements.define("web-slider", WebSlider);
}
