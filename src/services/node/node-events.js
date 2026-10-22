// src/services/node/node-events.js
//
// One router for everything a <svc-node> canvas emits — its own events (node-click, flow-end…) and
// whatever the components inside its panels dispatch (plan-select, purchase-complete…). Handlers are
// keyed by one fixed string shape, so a page never grows a pile of "if (id !== 'x') return" listeners:
//
//     '<nodeId>:<event-name>'   e.g. 'plans:plan-select', 'checkout:purchase-pick'
//     '*:<event-name>'          same event from any node (or from none, e.g. nodes-change)
//
// The node id is resolved per event (see nodeIdOf), never passed around by the components. Inline panels
// dispatch with `emit(e, name, detail)` from services/tools/util.js.

// Relative (not @/) so node --test can load this file without Vite's alias.
import { GROUP_PREFIX } from './group-layout.js'

export const ANY = '*'

// Kebab-case DOM event names only — keeps keys unambiguous against the ':' separator.
const EVENT_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** `'<nodeId>:<event-name>'` → `{ nodeId, name }`. The last ':' splits, so ids may contain one. */
export function parseKey(key) {
    const at = key.lastIndexOf(':')
    const nodeId = key.slice(0, at)
    const name = key.slice(at + 1)
    if (at <= 0 || !EVENT_NAME.test(name)) throw new Error(`[node-events] bad key "${key}" — expected "<nodeId>:<event-name>"`)
    return { nodeId, name }
}

/** The node an event belongs to: svc-node's own detail first, else the nearest [data-node-id] on its path
 *  (the panel chrome for panel content, the tile for node UI). Group tiles don't count as nodes. */
export function nodeIdOf(event) {
    const direct = event.detail?.node?.id ?? event.detail?.nodeId
    if (direct) return direct
    for (const el of event.composedPath()) {
        if (el === event.currentTarget) break
        const id = el?.dataset?.nodeId
        if (id && !id.startsWith(GROUP_PREFIX)) return id
    }
    return null
}

/**
 * @typedef {Object} NodeEventContext
 * @property {string | null} id - resolved node id (null for canvas-wide events)
 * @property {string} name - DOM event name
 * @property {any} detail
 * @property {Event} event - call `event.preventDefault()` to take over a cancelable component event
 * @property {EventTarget} target - the element the router listens on
 */

/**
 * Wires `handlers` to `target` (the <svc-node>): one DOM listener per event name, fanned out by node id.
 * `trace` names are console-logged (routed or not) for debugging. `alias(id)` → another id whose handlers also answer
 * (a user's copy of a node answers like the node it was made from — preset/mount.js).
 *
 * @param {EventTarget} target
 * @param {Record<string, (ctx: NodeEventContext) => void>} [handlers]
 * @param {{ trace?: string[], alias?: (id: string) => string | null | undefined }} [opts]
 */
export function createNodeEvents(target, handlers = {}, { trace = [], alias } = {}) {
    const routes = new Map() // name -> Map(nodeId -> Set(handler))
    const listeners = new Map() // name -> DOM listener
    const traced = new Set(trace)

    const dispatch = (name, event) => {
        const id = nodeIdOf(event)
        if (traced.has(name)) console.log(`[node-events] ${id ?? ANY}:${name}`, event.detail)
        const byNode = routes.get(name)
        if (!byNode) return
        const ctx = { id, name, detail: event.detail, event, target }
        const also = id ? alias?.(id) : null
        for (const key of id ? (also && also !== id ? [id, also, ANY] : [id, ANY]) : [ANY]) {
            for (const handler of byNode.get(key) ?? []) {
                // One broken handler must not starve the rest of the same event.
                try { handler(ctx) } catch (err) { console.error(`[node-events] ${key}:${name}`, err) }
            }
        }
    }

    const listen = (name) => {
        if (listeners.has(name)) return
        const listener = (event) => dispatch(name, event)
        target.addEventListener(name, listener)
        listeners.set(name, listener)
    }

    const on = (key, handler) => {
        const { nodeId, name } = parseKey(key)
        if (!routes.has(name)) routes.set(name, new Map())
        const byNode = routes.get(name)
        if (!byNode.has(nodeId)) byNode.set(nodeId, new Set())
        byNode.get(nodeId).add(handler)
        listen(name)
        return () => byNode.get(nodeId)?.delete(handler)
    }

    for (const name of traced) listen(name)
    for (const [key, handler] of Object.entries(handlers)) on(key, handler)

    return {
        on,
        dispose() {
            for (const [name, listener] of listeners) target.removeEventListener(name, listener)
            listeners.clear()
            routes.clear()
        },
    }
}
