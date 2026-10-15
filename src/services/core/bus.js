// Event Bus Global — registry + handler maps live only in this closure; callers get the functions below, never the maps.
// Every payload is cloned → validated → deep-frozen BEFORE any handler sees it, so a subscriber can neither mutate
// the publisher's data nor be fed a value that changed after validation (getter/Proxy TOCTOU).

const _channels = new Map() // name -> Readonly<{ schema?: (detail) => boolean }>
const _handlers = new Map() // name -> Set<handler>
const _bridges = new Set()  // `${domEvent}>${channel}` already wired

// '<scope>:<name>' only — rules out '*' and other wildcard-looking names a sniffing subscriber could abuse.
const CHANNEL_NAME = /^[a-z][a-z0-9-]*:[A-Za-z0-9_.-]+$/
const ERROR_CHANNEL = 'app:error'
const DEV = !!import.meta.env?.DEV

function _fail(message) {
    if (DEV) throw new Error(`[bus] ${message}`)
    console.warn(`[bus] ${message}`)
    return false
}

function _deepFreeze(value) {
    // Typed arrays with elements can't be frozen (TypeError) — they're fresh copies from structuredClone anyway.
    if (value && typeof value === 'object' && !Object.isFrozen(value) && !ArrayBuffer.isView(value)) {
        Object.freeze(value)
        for (const key of Reflect.ownKeys(value)) _deepFreeze(value[key])
    }
    return value
}

// structuredClone rejects functions, DOM nodes and Proxies — bus payloads must be plain data.
function _seal(detail) {
    if (detail === null || typeof detail !== 'object') return { ok: typeof detail !== 'function', value: detail }
    try {
        return { ok: true, value: _deepFreeze(structuredClone(detail)) }
    } catch {
        return { ok: false }
    }
}

// A schema that throws is a rejection, not a crash of the publisher.
function _valid(schema, value) {
    try { return schema(value) === true } catch { return false }
}

function _report(channel, err) {
    console.error(`[bus] handler for "${channel}" failed`, err)
    if (channel !== ERROR_CHANNEL) publish(ERROR_CHANNEL, { channel, message: String(err?.message ?? err) })
}

export function registerChannel(name, { schema } = {}) {
    if (!CHANNEL_NAME.test(name)) return _fail(`invalid channel name "${name}" — expected "<scope>:<name>"`)
    if (schema !== undefined && typeof schema !== 'function') return _fail(`schema for "${name}" must be a function`)
    const existing = _channels.get(name)
    if (existing) {
        // First registration wins; a different schema later is either a bug or someone squatting the channel.
        if (String(existing.schema) !== String(schema)) console.warn(`[bus] "${name}" already registered — new schema ignored`)
        return true
    }
    _channels.set(name, Object.freeze({ schema }))
    return true
}

export function publish(name, detail) {
    const channel = _channels.get(name)
    if (!channel) return _fail(`channel "${name}" is not registered — call registerChannel() first`)
    const handlers = _handlers.get(name)
    // Nobody listening (common for state:<section>) → skip the clone entirely.
    if (!handlers?.size) return true
    const sealed = _seal(detail)
    if (!sealed.ok) return _fail(`payload for "${name}" is not cloneable plain data`)
    if (channel.schema && !_valid(channel.schema, sealed.value)) {
        console.warn(`[bus] payload for "${name}" failed schema validation`, sealed.value)
        return false
    }
    // Snapshot so a handler that unsubscribes (e.g. once) doesn't skip its neighbour.
    for (const handler of [...handlers]) {
        try {
            const result = handler(sealed.value)
            if (typeof result?.then === 'function') result.then(null, (err) => _report(name, err))
        } catch (err) {
            _report(name, err)
        }
    }
    return true
}

export function subscribe(name, handler) {
    if (typeof handler !== 'function') throw new TypeError(`[bus] subscribe("${name}") needs a function`)
    if (!_channels.has(name)) {
        _fail(`channel "${name}" is not registered — call registerChannel() first`)
        return () => {}
    }
    if (!_handlers.has(name)) _handlers.set(name, new Set())
    _handlers.get(name).add(handler)
    return () => _handlers.get(name)?.delete(handler)
}

export function once(name, handler) {
    const off = subscribe(name, (detail) => {
        off()
        return handler(detail)
    })
    return off
}

// ── Orchestrator — domain-agnostic glue; domain wiring happens in services/app.js ──────────────────────

const _owned = new Set() // channels that already have their one business handler

/** Binds a domain's business logic to a command channel — call at import time (sync, before any await). */
export function registerHandler(channel, fn) {
    if (_owned.has(channel)) {
        console.warn(`[bus] "${channel}" already has a handler — ignored`)
        return () => {}
    }
    if (!_channels.has(channel)) {
        _fail(`registerHandler: channel "${channel}" is not registered`)
        return () => {}
    }
    const off = subscribe(channel, fn)
    _owned.add(channel)
    return () => { off(); _owned.delete(channel) }
}

/**
 * Wires a bubbling/composed CustomEvent onto a channel. DOM events are untrusted input (any script on the page can
 * dispatch them), so the channel MUST carry a schema. Idempotent per (event, channel); returns an unbind function.
 */
export function bridgeDomEvent(domEventName, channel, mapDetail = (event) => event.detail, target = globalThis.document) {
    if (!_channels.get(channel)?.schema) {
        _fail(`bridgeDomEvent("${domEventName}") → "${channel}" needs a registered channel with a schema`)
        return () => {}
    }
    const key = `${domEventName}>${channel}`
    if (_bridges.has(key) || !target) return () => {}
    const listener = (event) => {
        let detail
        try { detail = mapDetail(event) } catch (err) { return _report(channel, err) }
        publish(channel, detail)
    }
    target.addEventListener(domEventName, listener)
    _bridges.add(key)
    return () => { target.removeEventListener(domEventName, listener); _bridges.delete(key) }
}

registerChannel(ERROR_CHANNEL, { schema: (d) => typeof d?.message === 'string' })
