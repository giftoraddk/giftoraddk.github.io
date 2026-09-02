// ── wl-anim: micro Web-Animations-API engine ─────────────────────────────────

const _E = {
	easeOutExpo:   'cubic-bezier(0.19,1,0.22,1)',
	easeOutBack:   'cubic-bezier(0.34,1.56,0.64,1)',
	easeInOutQuad: 'cubic-bezier(0.45,0,0.55,1)',
	easeOutSine:   'cubic-bezier(0.61,1,0.88,1)',
	easeOutCirc:   'cubic-bezier(0,0.55,0.45,1)',
	easeInExpo:    'cubic-bezier(0.7,0,0.84,0)',
	'steps(1)':    'steps(1,end)',
	'steps(5)':    'steps(5,end)',
}

// CSS linear() easing sampled from JS fn — Chrome/FF/Safari ≥ 2023
const _lin = fn => 'linear(' + Array.from({length: 30}, (_, i) => fn(i / 29).toFixed(3)).join(',') + ')'

_E.easeOutElastic           = _lin(t => t === 0 || t === 1 ? t : Math.pow(2, -10*t) * Math.sin((t*10 - 0.75) * (2*Math.PI/3)) + 1)
_E['easeOutElastic(1, .4)'] = _lin(t => t === 0 || t === 1 ? t : Math.pow(2, -10*t) * Math.sin((t*10 - 0.75) * (2*Math.PI/2.5)) + 1)
_E.easeOutBounce            = _lin(t => {
	const n = 7.5625, d = 2.75
	if (t < 1/d)   return n*t*t
	if (t < 2/d)   return n*(t -= 1.5/d)*t + 0.75
	if (t < 2.5/d) return n*(t -= 2.25/d)*t + 0.9375
	return n*(t -= 2.625/d)*t + 0.984375
})

// transform property names → css function + unit
const _TFM = new Set(['translateX','translateY','translateZ','rotateX','rotateY','rotateZ','rotate','scale','scaleX','scaleY','skewX','skewY'])
const _tfv = (k, v) => typeof v === 'number'
	? v + (/^translate/.test(k) ? 'px' : /^(rotate|skew)/.test(k) ? 'deg' : '')
	: String(v)

// convert animejs-style props → WAAPI keyframe array
function _kf(props) {
	const f = {}, t = {}, tf = [], tt = []
	for (const [k, v] of Object.entries(props)) {
		if (k === 'easing' || k === 'duration' || k === 'delay') continue
		const [a, b] = Array.isArray(v) ? v : [null, v]
		if (_TFM.has(k)) {
			if (a !== null) tf.push(`${k}(${_tfv(k, a)})`)
			tt.push(`${k}(${_tfv(k, b)})`)
		} else {
			if (a !== null) f[k] = a
			t[k] = b
		}
	}
	if (tf.length) f.transform = tf.join(' ')
	if (tt.length) t.transform = tt.join(' ')
	return Object.keys(f).length ? [f, t] : [t]
}

const _rd = (d, i, n) => typeof d === 'function' ? d(i, n) : (d ?? 0)

export function stagger(step, { from, start = 0 } = {}) {
	return (i, n) => start + (from === 'center' ? Math.abs(i - (n - 1) / 2) : i) * step
}

class _Tl {
	constructor({ loop = false, onLoop } = {}) {
		this._loop   = loop
		this._onLoop = onLoop
		this._cur    = 0
		this._sched  = []
		this._anims  = []
		this._timer  = null
	}

	add(targets, props = {}, at) {
		const els = Array.isArray(targets) ? targets : [targets]
		const { duration = 800, delay: rd = 0, easing = 'linear', ...rest } = props
		const kf   = _kf(rest)
		const css  = _E[easing] ?? easing
		const t0   = at ?? this._cur
		let maxEnd = this._cur

		els.forEach((el, i) => {
			const d = t0 + _rd(rd, i, els.length)
			this._sched.push({ el, kf, duration, d, css })
			this._anims.push(el.animate(kf, { duration, delay: d, fill: 'forwards', easing: css }))
			if (d + duration > maxEnd) maxEnd = d + duration
		})

		this._cur = maxEnd
		if (this._loop) {
			clearTimeout(this._timer)
			this._timer = setTimeout(() => this._restart(), this._cur + 50)
		}
		return this
	}

	_restart() {
		this._onLoop?.()
		this._anims.forEach(a => a.cancel())
		this._anims = this._sched.map(({ el, kf, duration, d, css }) =>
			el.animate(kf, { duration, delay: d, fill: 'forwards', easing: css }))
		this._timer = setTimeout(() => this._restart(), this._cur + 50)
	}

	pause() {
		clearTimeout(this._timer)
		this._anims.forEach(a => a.cancel())
	}
}

export const createTimeline = opts => new _Tl(opts)
