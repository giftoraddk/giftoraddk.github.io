import { LitElement, html, nothing, unsafeCSS } from 'lit'
import styles from './css/web-letters.css?inline'
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js'
import { cssInline } from '@/services/tools/util.js'
import { createTimeline, stagger } from '@/services/tools/motion.js'
import 'iconify-icon'
import './web-loader.js'

// ── Effect helpers ────────────────────────────────────────────────────────────
// Every effect = an entrance (.add) then an exit (.exit — the text fading out / the letters leaving). The exit only
// plays when looping, to clear the stage for the next round; a one-shot run (loop false, the default) ends on the text.
const wlTl   = (wrapper, loop) => {
	const tl = createTimeline({ loop, onLoop: () => { wrapper.style.opacity = '1' } })
	tl.exit = (...args) => (loop ? tl.add(...args) : tl)
	return tl
}
const wlFade = (wrapper, hold) => [wrapper, { opacity: 0, duration: 1000, easing: 'easeOutExpo', delay: hold }]
const wlHide = units => units.forEach(u => { u.style.opacity = '0' })

export class WebLetters extends LitElement {

	static styles = [unsafeCSS(styles)]

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
		loop:     { type: Boolean },  // false (default) → plays once and stays; true → repeats while in view
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
		this.loop     = false
		this.word     = false
		this.duration = 700
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
		this._inView   = false // in the viewport now
		this._doneTimer = null // one-shot: fires when its entrance has played through in view → stop watching
		this._observer = null
		this._loaderW  = `${Math.floor(Math.random() * 50 + 30)}%`
	}

	// ── Lifecycle ──────────────────────────────────────────────────────────────

	connectedCallback() {
		super.connectedCallback()
		if (this.motion && !this._observer && !this._anim) this._setupObserver()
	}

	disconnectedCallback() {
		super.disconnectedCallback()
		this._observer?.disconnect()
		this._observer = null
		this._stopAnim()
	}

	// Stops the run and puts the text back as it was before playing: hidden (.wl-motion), the ghost holding its size.
	_stopAnim() {
		clearTimeout(this._doneTimer)
		this._doneTimer = null
		this._anim?.pause()
		this._anim = null
		const root = this.renderRoot
		if (!root?.querySelector) return
		const wrapper = root.querySelector('.wl-text')
		const content = root.querySelector('.wl-content')
		const ghost   = root.querySelector('.wl-ghost')
		if (wrapper) wrapper.style.opacity = ''
		if (content) content.textContent = ''
		if (ghost) ghost.style.display = ''
	}

	// A one-shot run counts only once its whole entrance has played in view — then the text stays, unwatched.
	_finish() {
		this._doneTimer = null
		this._observer?.disconnect()
		this._observer = null
	}

	updated(changed) {
		if (!changed.has('text') && !changed.has('content') && !changed.has('effect') &&
		    !changed.has('word') && !changed.has('tag') && !changed.has('motion') && !changed.has('loop')) return

		if (changed.has('motion') || changed.has('loop')) {
			this._stopAnim()
			this._observer?.disconnect()
			this._observer = null
			this._inView = false
			if (this.motion) this._setupObserver()
			return
		}

		if (!this.motion) return

		// New text / effect: start over — the observer's first report plays it if it is on screen now.
		this._stopAnim()
		this._setupObserver()
	}

	// ── Observer ───────────────────────────────────────────────────────────────

	// Runs only in view: it starts once half of it is on screen. Leaving the screen stops it and puts it back to the
	// start — a loop pauses (not burning frames) until it comes back; a one-shot whose entrance hadn't finished (the
	// page was still laying out above it and pushed it down, or it was scrolled past mid-way) plays again, from the
	// start, the next time it shows. A one-shot that played through in view stops watching (_finish).
	_setupObserver() {
		this._observer?.disconnect()
		this._observer = new IntersectionObserver(([entry]) => {
			this._inView = entry.isIntersecting
			if (entry.isIntersecting) {
				if (!this._anim) this._play()
			} else {
				this._stopAnim()
			}
		}, { threshold: 0.5 })
		this._observer.observe(this)
	}

	// ── Helpers ────────────────────────────────────────────────────────────────

	_iconPart(icon, side) {
		if (!icon) return nothing
		const m = side === 'pre' ? 'margin-right:0.375rem' : 'margin-left:0.375rem'
		return this.iconSize
			? html`<iconify-icon .icon=${icon} aria-hidden="true" style="${m};vertical-align:sub;font-size:${this.iconSize}"></iconify-icon>`
			: html`<span>${icon}</span>`
	}

	// ── Split ──────────────────────────────────────────────────────────────────

	// content đến từ data section (có thể do người dùng nhập) — escape TRƯỚC khi ghép vào innerHTML, không thì
	// '<img onerror=…>' trong title chạy được (XSS). Chế độ ký tự tách theo ký tự GỐC rồi mới escape từng ký tự,
	// để '&amp;' không bị cắt vụn thành 5 span.
	// Chế độ ký tự: các ký tự của một từ được bọc chung trong .wl-word (nowrap) — mỗi .wl-unit là inline-block nên
	// nếu để rời, trình duyệt có thể xuống dòng giữa hai chữ cái ("ng | hiệp").
	_split(el, text) {
		const esc  = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
		const span = w => `<span class="wl-unit">${esc(w)}</span>`
		const word = w => `<span class="wl-word">${[...w].map(span).join('')}</span>`
		const lines = text.split('\n')
		el.innerHTML = lines.map(line => line.split(/(\s+)/)
			.map(part => /\S/.test(part) ? (this.word ? span(part) : word(part)) : part)
			.join('')
		).join('<br>')
		return el.querySelectorAll('.wl-unit')
	}

	// ── Play ───────────────────────────────────────────────────────────────────

	async _play() {
		await this.updateComplete
		const wrapper = this.renderRoot.querySelector('.wl-text')
		const el      = this.renderRoot.querySelector('.wl-content') ?? wrapper
		if (!el) return
		const fn = WebLetters._effects.get(this.effect)
		if (!fn) return
		this._stopAnim() // a scroll back in view can land while the previous round's await was pending
		if (!this._inView) return // scrolled away while it waited for the render
		const units = this._split(el, String(this.content || this.text || ''))
		const ghost = this.renderRoot.querySelector('.wl-ghost')
		if (ghost) ghost.style.display = 'none' // the letters take its place — same text, same size
		if (wrapper) wrapper.style.opacity = '1'
		this._anim  = fn(wrapper, units, { loop: this.loop, duration: this.duration, delay: this.delay, hold: this.hold })
		if (!this.loop) this._doneTimer = setTimeout(() => this._finish(), this._anim?.end ?? 0)
	}

	// ── Render ─────────────────────────────────────────────────────────────────

	render() {
		const tag   = unsafeStatic(WebLetters._TAGS.has(this.tag) ? this.tag : 'span')
		const src   = String(this.content || this.text || '')
		const style = cssInline({ ...(this.stys || {}) })
		const cls   = ['wl-text', this.motion && 'wl-motion', this.ui, this.cls].filter(Boolean).join(' ')
		const pre   = this._iconPart(this.prefix, 'pre')
		const suf   = this._iconPart(this.suffix, 'suf')

		const lines = src.includes('\n')
			? src.split('\n').reduce((acc, line, i) => i === 0 ? [line] : [...acc, html`<br>`, line], [])
			: src

		// motion: chữ hiệu ứng (rỗng tới khi chạy, rồi bị tách thành từng span) ẩn khỏi trình đọc màn hình; bản chữ
		// liền (wl-sr, ẩn bằng mắt) làm nội dung thật của heading ngay từ đầu — không còn heading rỗng. wl-ghost = cùng
		// chữ đó, trong suốt (.wl-motion), giữ đúng kích thước tới lúc chạy: thiếu nó heading cao 0px, các section phía
		// dưới bị kéo lên lúc trang mới dựng → lọt vào màn hình và chạy hiệu ứng khi người xem chưa cuộn tới.
		if (this.motion) {
			return staticHtml`<${tag} class="${cls}" style="${style}">${pre}<span class="wl-sr">${src.replace(/\n+/g, ' ')}</span><span class="wl-ghost" aria-hidden="true">${lines}</span><span class="wl-content" aria-hidden="true"></span>${suf}</${tag}>`
		}

		const body = this.loading
			? html`<web-loader width="${this._loaderW}" height="1em"></web-loader>`
			: lines

		return staticHtml`<${tag} class="${cls}" style="${style}">${pre}${body}${suf}</${tag}>`
	}
}

// ── Built-in effects ──────────────────────────────────────────────────────────
// Effect fn signature: fn(wrapper, units, { loop, duration, delay, hold }) → animation
// wrapper = outer tag element  |  units = NodeList of .wl-unit spans
// Build it with wlTl(): .add() the entrance, .exit() the way out (played only when looping).
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

// Letters zoom from scale-4, then (looping) wrapper fades out.
WebLetters.register('zoomIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { scale: [4, 1], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters expand from microscopic scale with soft overshoot, then (looping) wrapper fades out.
WebLetters.register('zoomOut', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { scale: [0.1, 1], opacity: [0, 1], easing: 'easeOutBack', duration, delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters fade in sequentially, then (looping) wrapper fades out.
WebLetters.register('fadeIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { opacity: [0, 1], easing: 'easeInOutQuad', duration, delay: stagger(delay, { start: delay }) })
		.exit(...wlFade(wrapper, hold))
})

// Letters sharpen from blur while fading in, then (looping) wrapper fades out.
WebLetters.register('blurIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { filter: ['blur(8px)', 'blur(0px)'], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters appear one by one like a typewriter, then (looping) wrapper fades out.
WebLetters.register('typeIn', (wrapper, units, { loop, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { opacity: [0, 1], easing: 'steps(1)', duration: 50, delay: stagger(Math.max(delay, 60), { start: 300 }) })
		.exit(...wlFade(wrapper, hold))
})

// Letters slide up from below with elastic sway, then (looping) wrapper fades out.
WebLetters.register('slideUp', (wrapper, units, { loop, duration, delay, hold }) => {
	units.forEach(u => { u.style.opacity = '0'; u.style.transformOrigin = '50% 100%' })
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['1.1em', 0], rotate: [3, 0], opacity: [0, 1], easing: 'easeOutElastic', duration, delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters slide down from above with elastic sway, then (looping) wrapper fades out. Opposite of slideUp.
WebLetters.register('slideDown', (wrapper, units, { loop, duration, delay, hold }) => {
	units.forEach(u => { u.style.opacity = '0'; u.style.transformOrigin = '50% 0%' })
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['-1.1em', 0], rotate: [-3, 0], opacity: [0, 1], easing: 'easeOutElastic', duration, delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters drift gently upward from a slight offset with smooth ease, then (looping) wrapper fades out.
WebLetters.register('floatIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['0.6em', 0], opacity: [0, 1], easing: 'easeOutSine', duration: Math.round(duration * 1.4), delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters rise in from below, then (looping) exit upward per-unit.
WebLetters.register('riseUp', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr = [...units]
	return wlTl(wrapper, loop)
		.add(arr, { translateY: [100, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay, { start: 300 }) })
		.exit(arr, { translateY: [0, -100], opacity: [1, 0], easing: 'easeInExpo', duration: Math.round(duration * 0.85), delay: stagger(delay, { start: hold + 100 }) })
})

// Letters fall in from above, then (looping) exit downward per-unit.
WebLetters.register('fallDown', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr = [...units]
	return wlTl(wrapper, loop)
		.add(arr, { translateY: [-100, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay, { start: 300 }) })
		.exit(arr, { translateY: [0, 100], opacity: [1, 0], easing: 'easeInExpo', duration: Math.round(duration * 0.85), delay: stagger(delay, { start: hold + 100 }) })
})

// Letters slide in from right, then (looping) drift out to the left per-unit.
WebLetters.register('driftIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr = [...units]
	return wlTl(wrapper, loop)
		.add(arr, { translateX: [40, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay, { start: 500 }) })
		.exit(arr, { translateX: [0, -30], opacity: [1, 0], easing: 'easeInExpo', duration: Math.round(duration * 0.9), delay: stagger(delay, { start: hold + 100 }) })
})

// Letters spin 180° in from bottom-right corner, then (looping) wrapper fades out.
WebLetters.register('spinIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['1.1em', 0], translateX: ['0.55em', 0], rotateZ: [180, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters flip in around Y-axis from -90°, then (looping) wrapper fades out.
WebLetters.register('flipIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { rotateY: [-90, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters flip in around X-axis from -90°, then (looping) wrapper fades out. Opposite axis of flipIn.
WebLetters.register('flipX', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { rotateX: [-90, 0], opacity: [0, 1], easing: 'easeOutExpo', duration, delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters swing in like a pendulum anchored at the top with elastic, then (looping) wrapper fades out.
WebLetters.register('swingIn', (wrapper, units, { loop, duration, delay, hold }) => {
	units.forEach(u => { u.style.opacity = '0'; u.style.transformOrigin = '50% 0%' })
	return wlTl(wrapper, loop)
		.add([...units], { rotateZ: [-60, 0], opacity: [0, 1], easing: 'easeOutElastic(1, .4)', duration: Math.round(duration * 1.3), delay: stagger(delay) })
		.exit(...wlFade(wrapper, hold))
})

// Letters ripple in from the centre outward in a wave, then (looping) wrapper fades out.
WebLetters.register('waveIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { translateY: ['1em', 0], opacity: [0, 1], easing: 'easeOutElastic', duration: Math.round(duration * 1.1), delay: stagger(delay, { from: 'center' }) })
		.exit(...wlFade(wrapper, hold))
})

// Letters appear sequentially (staggered), then (looping) ALL scale up and fade out together.
WebLetters.register('pulseIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr      = [...units]
	const enterDur = Math.round(duration * 0.5)
	return wlTl(wrapper, loop)
		.add(arr, { scale: [0.2, 1], opacity: [0, 1], easing: 'easeOutExpo', duration: enterDur, delay: stagger(delay) })
		.exit(arr, { scale: [1, 3],   opacity: [1, 0], easing: 'easeInExpo',  duration: Math.round(duration * 0.45), delay: hold })
})

// Words zoom from scale-14 down sequentially, then (looping) wrapper fades out. Best with word=true.
WebLetters.register('focusIn', (wrapper, units, { loop, duration, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { scale: [14, 1], opacity: [0, 1], easing: 'easeOutSine', duration, delay: stagger(duration) })
		.exit(...wlFade(wrapper, hold))
})

// Words grow from microscopic (scale 0) to full size. Best with word=true.
WebLetters.register('pinIn', (wrapper, units, { loop, duration, hold }) => {
	wlHide(units)
	return wlTl(wrapper, loop)
		.add([...units], { scale: [0, 1], opacity: [0, 1], easing: 'easeOutCirc', duration, delay: stagger(duration) })
		.exit(...wlFade(wrapper, hold))
})

// Letters appear with digital glitch distortion, then (looping) wrapper fades out.
WebLetters.register('glitchIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr  = [...units]
	const half = Math.round(duration * 0.5)
	return wlTl(wrapper, loop)
		.add(arr, { skewX: [20, 0], opacity: [0, 1], easing: 'steps(5)', duration: half, delay: stagger(delay * 0.8) })
		.add(arr, { skewX: [-4, 0], easing: 'easeOutBounce', duration: half })
		.exit(...wlFade(wrapper, hold))
})

// Letters gather from a golden-spiral spread into place, then (looping) wrapper fades out.
WebLetters.register('scatterIn', (wrapper, units, { loop, duration, delay, hold }) => {
	wlHide(units)
	const arr = [...units]
	const tl  = wlTl(wrapper, loop)
	arr.forEach((u, i) => {
		const a  = (i * 137.508) % 360
		const r  = 60 + (i % 4) * 20
		tl.add([u], { translateX: [Math.round(Math.cos(a * Math.PI / 180) * r), 0], translateY: [Math.round(Math.sin(a * Math.PI / 180) * r), 0], opacity: [0, 1], easing: 'easeOutExpo', duration }, i * delay)
	})
	return tl.exit(...wlFade(wrapper, hold))
})

if (!customElements.get('web-letters')) customElements.define('web-letters', WebLetters)
