import { LitElement, html, nothing, css } from 'lit'
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js'
import { cssInline } from '@/services/helper.js'
import { createTimeline, stagger } from '@/scripts/motion.js'
import 'iconify-icon'
import './web-loader.js'

// ── Effect helpers ────────────────────────────────────────────────────────────
const wlTl   = (wrapper, loop) =>
	createTimeline({ loop, onLoop: () => { wrapper.style.opacity = '1' } })
const wlFade = (wrapper, hold) => [wrapper, { opacity: 0, duration: 1000, easing: 'easeOutExpo', delay: hold }]
const wlHide = units => units.forEach(u => { u.style.opacity = '0' })

export class WebLetters extends LitElement {

	static styles = css`
		:host { user-select: text; }
    :host([flex="1"]) { flex: 1; }
		.wl-text { margin: 0; }
		.wl-unit { display: inline-block; }
		.wl-motion { opacity: 0; }

		/* Typography chuẩn — xem hook/DESIGN.rst § "Font size chuẩn". Override qua stys (kèm // custom <prop>). */
		h1.wl-text { font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; white-space: pre-line; }
		h2.wl-text { font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; white-space: pre-line; }
		h3.wl-text { font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 600; line-height: 1.2; letter-spacing: -0.01em; white-space: pre-line; }
		h4.wl-text { font-size: clamp(1.5rem, 2.5vw, 2rem); font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; white-space: pre-line; }
		h5.wl-text { font-size: clamp(1.25rem, 2vw, 1.5rem); font-weight: 600; line-height: 1.3; }
		h6.wl-text { font-size: clamp(1rem, 1.5vw, 1.25rem); font-weight: 600; line-height: 1.35; }
		p.wl-text { font-size: clamp(0.875rem, 1.2vw, 1rem); font-weight: 400; line-height: 1.6; }
		span.wl-text { font-size: clamp(0.875rem, 1.2vw, 1rem); font-weight: inherit; line-height: inherit; }
	`

	// ── Registry ───────────────────────────────────────────────────────────────
	static _effects = new Map()
	static register(key, fn) { WebLetters._effects.set(key, fn) }

	// ── Properties ─────────────────────────────────────────────────────────────
	static properties = {
		text:     { type: String },
		content:  { type: String },   // alias for text — web-cell compat
		tag:      { type: String },   // h1–h6 | p | span (default)
		motion:   { type: Boolean },  // false (default) → plain text, true → animate
		effect:   { type: String },
		loop:     { type: Boolean },
		word:     { type: Boolean },  // true → split by word, false → split by char
		duration: { type: Number },
		delay:    { type: Number },
		hold:     { type: Number },   // text display time
		// web-cell compat
		prefix:   { type: String },
		suffix:   { type: String },
		iconSize: { type: String },
		cls:      { type: String },
		stys:     { type: Object },
		ui:       { type: String },
		loading:  { type: Boolean },
	}

	static _TAGS = new Set(['h1','h2','h3','h4','h5','h6','p','span'])

	constructor() {
		super()
		this.text     = ''
		this.content  = ''
		this.tag      = 'span'
		this.motion   = false
		this.effect   = 'zoomIn'
		this.loop     = true
		this.word     = false
		this.duration = 800
		this.delay    = 70
		this.hold     = 3000
		this.prefix   = ''
		this.suffix   = ''
		this.iconSize = ''
		this.cls      = ''
		this.stys     = {}
		this.ui       = ''
		this.loading  = false
		this._anim     = null
		this._seen     = false
		this._observer = null
		this._loaderW  = `${Math.floor(Math.random() * 50 + 30)}%`
	}

	// ── Lifecycle ──────────────────────────────────────────────────────────────

	connectedCallback() {
		super.connectedCallback()
		if (this.motion && !this._seen) this._setupObserver()
	}

	disconnectedCallback() {
		super.disconnectedCallback()
		this._observer?.disconnect()
		this._observer = null
		this._stopAnim()
	}

	_stopAnim() {
		this._anim?.pause()
		this._anim = null
	}

	updated(changed) {
		if (!changed.has('text') && !changed.has('content') && !changed.has('effect') &&
		    !changed.has('word') && !changed.has('tag') && !changed.has('motion')) return

		if (changed.has('motion')) {
			if (this.motion) {
				this._seen = false
				this._setupObserver()
			} else {
				this._stopAnim()
				this._observer?.disconnect()
				this._observer = null
				this._seen = false
			}
			return
		}

		if (!this.motion) return

		this._stopAnim()
		if (this._seen) this._play()
	}

	// ── Observer ───────────────────────────────────────────────────────────────

	_setupObserver() {
		this._observer?.disconnect()
		this._observer = new IntersectionObserver(([entry]) => {
			if (!entry.isIntersecting) return
			this._observer.disconnect()
			this._observer = null
			this._seen = true
			this._play()
		}, { threshold: 0.5 })
		this._observer.observe(this)
	}

	// ── Helpers ────────────────────────────────────────────────────────────────

	_iconPart(icon, side) {
		if (!icon) return nothing
		const m = side === 'pre' ? 'margin-right:0.375rem' : 'margin-left:0.375rem'
		return this.iconSize
			? html`<iconify-icon .icon=${icon} style="${m};vertical-align:sub;font-size:${this.iconSize}"></iconify-icon>`
			: html`<span>${icon}</span>`
	}

	// ── Split ──────────────────────────────────────────────────────────────────

	_split(el, text) {
		const span = w => `<span class="wl-unit">${w}</span>`
		const lines = text.split('\n')
		if (this.word) {
			el.innerHTML = lines.map(line =>
				line.split(/(\s+)/).map(part => /\S/.test(part) ? span(part) : part).join('')
			).join('<br>')
		} else {
			el.innerHTML = lines.map(line =>
				line.replace(/\S/g, span('$&'))
			).join('<br>')
		}
		return el.querySelectorAll('.wl-unit')
	}

	// ── Play ───────────────────────────────────────────────────────────────────

	async _play() {
		await this.updateComplete
		const wrapper = this.renderRoot.querySelector('.wl-text')
		const el      = this.renderRoot.querySelector('.wl-content') ?? wrapper
		if (!el) return
		if (wrapper) wrapper.style.opacity = '1'
		const fn = WebLetters._effects.get(this.effect)
		if (!fn) return
		const units = this._split(el, String(this.content || this.text || ''))
		this._anim  = fn(wrapper, units, { loop: this.loop, duration: this.duration, delay: this.delay, hold: this.hold })
	}

	// ── Render ─────────────────────────────────────────────────────────────────

	render() {
		const tag   = unsafeStatic(WebLetters._TAGS.has(this.tag) ? this.tag : 'span')
		const src   = String(this.content || this.text || '')
		const style = cssInline({ ...(this.stys || {}) })
		const cls   = ['wl-text', this.motion && 'wl-motion', this.ui, this.cls].filter(Boolean).join(' ')
		const pre   = this._iconPart(this.prefix, 'pre')
		const suf   = this._iconPart(this.suffix, 'suf')

		if (this.motion) {
			return staticHtml`<${tag} class="${cls}" style="${style}">${pre}<span class="wl-content"></span>${suf}</${tag}>`
		}

		const body = this.loading
			? html`<web-loader width="${this._loaderW}" height="1em"></web-loader>`
			: src.includes('\n')
				? src.split('\n').reduce((acc, line, i) => i === 0 ? [line] : [...acc, html`<br>`, line], [])
				: src

		return staticHtml`<${tag} class="${cls}" style="${style}">${pre}${body}${suf}</${tag}>`
	}
}

// ── Built-in effects ──────────────────────────────────────────────────────────
// Effect fn signature: fn(wrapper, units, { loop, duration, delay }) → animation
// wrapper = outer tag element  |  units = NodeList of .wl-unit spans
//
// Zoom pair    zoomIn   · zoomOut
// Fade family  fadeIn   · blurIn  · typeIn
// Slide pair   slideUp  · slideDown
// Float        floatIn
// Drop family  riseUp  · fallDown
// Drift        driftIn
// Spin family  spinIn   · flipIn  · flipX    · swingIn
// Spring/Wave  waveIn   · pulseIn
// Word-level   focusIn  · pinIn
// Special      glitchIn · scatterIn

// Letters zoom from scale-4, then wrapper fades out.
WebLetters.register('zoomIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { scale: [4, 1], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters expand from microscopic scale with soft overshoot, then wrapper fades out.
WebLetters.register('zoomOut', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { scale: [0.1, 1], opacity: [0, 1], easing: 'easeOutBack', duration, delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters fade in sequentially, then wrapper fades out.
WebLetters.register('fadeIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { opacity: [0, 1], easing: 'easeInOutQuad', duration, delay: stagger(delay, { start: delay }) })
		.add(...wlFade(wrapper, hold))
})

// Letters sharpen from blur while fading in, then wrapper fades out.
WebLetters.register('blurIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { filter: ['blur(8px)', 'blur(0px)'], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters appear one by one like a typewriter, then wrapper fades out.
WebLetters.register('typeIn', (wrapper, units, { loop, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { opacity: [0, 1], easing: 'steps(1)', duration: 50, delay: stagger(Math.max(delay, 60), { start: 300 }) })
		.add(...wlFade(wrapper, hold))
})

// Letters slide up from below with elastic sway, then wrapper fades out.
WebLetters.register('slideUp', (wrapper, units, { loop, duration, delay, hold }) => {
	units.forEach(u => { u.style.opacity = '0'; u.style.transformOrigin = '50% 100%' })
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['1.1em', 0], rotate: [3, 0], opacity: [0, 1], easing: 'easeOutElastic', duration, delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters slide down from above with elastic sway, then wrapper fades out. Opposite of slideUp.
WebLetters.register('slideDown', (wrapper, units, { loop, duration, delay, hold }) => {
	units.forEach(u => { u.style.opacity = '0'; u.style.transformOrigin = '50% 0%' })
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['-1.1em', 0], rotate: [-3, 0], opacity: [0, 1], easing: 'easeOutElastic', duration, delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters drift gently upward from a slight offset with smooth ease, then wrapper fades out.
WebLetters.register('floatIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['0.6em', 0], opacity: [0, 1], easing: 'easeOutSine', duration: Math.round(duration * 1.4), delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters rise in from below, then exit upward per-unit.
WebLetters.register('riseUp', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr = [...units]
	return wlTl(wrapper, loop)
		.add(arr, { translateY: [100, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay, { start: 300 }) })
		.add(arr, { translateY: [0, -100], opacity: [1, 0], easing: 'easeInExpo', duration: Math.round(duration * 0.85), delay: stagger(delay, { start: hold + 100 }) })
})

// Letters fall in from above, then exit downward per-unit.
WebLetters.register('fallDown', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr = [...units]
	return wlTl(wrapper, loop)
		.add(arr, { translateY: [-100, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay, { start: 300 }) })
		.add(arr, { translateY: [0, 100], opacity: [1, 0], easing: 'easeInExpo', duration: Math.round(duration * 0.85), delay: stagger(delay, { start: hold + 100 }) })
})

// Letters slide in from right, then drift out to the left per-unit.
WebLetters.register('driftIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr = [...units]
	return wlTl(wrapper, loop)
		.add(arr, { translateX: [40, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay, { start: 500 }) })
		.add(arr, { translateX: [0, -30], opacity: [1, 0], easing: 'easeInExpo', duration: Math.round(duration * 0.9), delay: stagger(delay, { start: hold + 100 }) })
})

// Letters spin 180° in from bottom-right corner, then wrapper fades out.
WebLetters.register('spinIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['1.1em', 0], translateX: ['0.55em', 0], rotateZ: [180, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters flip in around Y-axis from -90°, then wrapper fades out.
WebLetters.register('flipIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { rotateY: [-90, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters flip in around X-axis from -90°, then wrapper fades out. Opposite axis of flipIn.
WebLetters.register('flipX', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { rotateX: [-90, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters swing in like a pendulum anchored at the top with elastic, then wrapper fades out.
WebLetters.register('swingIn', (wrapper, units, { loop, duration, delay, hold }) => {
	units.forEach(u => { u.style.opacity = '0'; u.style.transformOrigin = '50% 0%' })
	return wlTl(wrapper, loop)
		.add([...units], { rotateZ: [-60, 0], opacity: [0, 1], easing: 'easeOutElastic(1, .4)', duration: Math.round(duration * 1.3), delay: stagger(delay) })
		.add(...wlFade(wrapper, hold))
})

// Letters ripple in from the centre outward in a wave, then wrapper fades out.
WebLetters.register('waveIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['1em', 0], opacity: [0, 1], easing: 'easeOutElastic', duration: Math.round(duration * 1.1), delay: stagger(delay, { from: 'center' }) })
		.add(...wlFade(wrapper, hold))
})

// Letters appear sequentially (staggered), then ALL scale up and fade out together.
WebLetters.register('pulseIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr      = [...units]
	const enterDur = Math.round(duration * 0.5)
	return wlTl(wrapper, loop)
		.add(arr, { scale: [0.2, 1], opacity: [0, 1], easing: 'easeOutExpo', duration: enterDur, delay: stagger(delay) })
		.add(arr, { scale: [1, 3],   opacity: [1, 0], easing: 'easeInExpo',  duration: Math.round(duration * 0.45), delay: hold })
})

// Words zoom from scale-14 down sequentially, then wrapper fades out. Best with word=true.
WebLetters.register('focusIn', (wrapper, units, { loop, duration, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { scale: [14, 1], opacity: [0, 1], easing: 'easeOutSine', duration, delay: stagger(duration) })
		.add(...wlFade(wrapper, hold))
})

// Words grow from microscopic (scale 0) to full size. Best with word=true.
WebLetters.register('pinIn', (wrapper, units, { loop, duration, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { scale: [0, 1], opacity: [0, 1], easing: 'easeOutCirc', duration, delay: stagger(duration) })
		.add(...wlFade(wrapper, hold))
})

// Letters appear with digital glitch distortion, then wrapper fades out.
WebLetters.register('glitchIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr  = [...units]
	const half = Math.round(duration * 0.5)
	return wlTl(wrapper, loop)
		.add(arr, { skewX: [20, 0], opacity: [0, 1], easing: 'steps(5)', duration: half, delay: stagger(delay * 0.8) })
		.add(arr, { skewX: [-4, 0], easing: 'easeOutBounce', duration: half })
		.add(...wlFade(wrapper, hold))
})

// Letters gather from a golden-spiral spread into place, then wrapper fades out.
WebLetters.register('scatterIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr = [...units]
	const tl  = wlTl(wrapper, loop)
	arr.forEach((u, i) => {
		const a  = (i * 137.508) % 360
		const r  = 60 + (i % 4) * 20
		tl.add([u], { translateX: [Math.round(Math.cos(a * Math.PI / 180) * r), 0], translateY: [Math.round(Math.sin(a * Math.PI / 180) * r), 0], opacity: [0, 1], easing: 'easeOutExpo', duration }, i * delay)
	})
	return tl.add(...wlFade(wrapper, hold))
})

if (!customElements.get('web-letters')) customElements.define('web-letters', WebLetters)
