import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createNodeEvents, nodeIdOf, parseKey } from './node-events.js'
import { emit } from '../tools/util.js'

// Stand-ins for DOM elements: an EventTarget with a dataset, and an event whose path we control.
const fakeEvent = (path, detail, currentTarget = null) => ({ detail, currentTarget, composedPath: () => path })

test('parseKey splits on the last colon and rejects malformed keys', () => {
    assert.deepEqual(parseKey('plans:plan-select'), { nodeId: 'plans', name: 'plan-select' })
    assert.deepEqual(parseKey('*:flow-end'), { nodeId: '*', name: 'flow-end' })
    assert.deepEqual(parseKey('a:b:node-click'), { nodeId: 'a:b', name: 'node-click' })
    for (const bad of ['plan-select', ':plan-select', 'plans:', 'plans:PlanSelect', 'plans:plan_select']) {
        assert.throws(() => parseKey(bad), /bad key/)
    }
})

test('nodeIdOf prefers the detail, then the nearest node on the path, skipping group tiles', () => {
    assert.equal(nodeIdOf(fakeEvent([], { node: { id: 'checkout' } })), 'checkout')
    assert.equal(nodeIdOf(fakeEvent([], { nodeId: 'plans' })), 'plans')
    const inner = { dataset: {} }
    const chrome = { dataset: { nodeId: 'plans' } }
    const group = { dataset: { nodeId: 'group:social' } }
    assert.equal(nodeIdOf(fakeEvent([inner, chrome], {})), 'plans')
    assert.equal(nodeIdOf(fakeEvent([inner, group], {})), null)
    // Nothing above the listener counts — a page wrapper with data-node-id must not leak in.
    const host = { dataset: {} }
    assert.equal(nodeIdOf(fakeEvent([inner, host, chrome], {}, host)), null)
})

test('createNodeEvents fans one event out to its node and to "*", and dispose() unhooks', () => {
    const target = new EventTarget()
    const calls = []
    const router = createNodeEvents(target, {
        'plans:plan-select': ({ id, detail }) => calls.push(['plans', id, detail.intent]),
        'checkout:plan-select': () => calls.push(['checkout']),
        '*:plan-select': ({ id }) => calls.push(['any', id]),
    })
    target.dispatchEvent(new CustomEvent('plan-select', { detail: { nodeId: 'plans', intent: 'manage' } }))
    assert.deepEqual(calls, [['plans', 'plans', 'manage'], ['any', 'plans']])

    calls.length = 0
    target.dispatchEvent(new CustomEvent('plan-select', { detail: {} }))
    assert.deepEqual(calls, [['any', null]])

    calls.length = 0
    router.dispose()
    target.dispatchEvent(new CustomEvent('plan-select', { detail: { nodeId: 'plans' } }))
    assert.deepEqual(calls, [])
})

test('a throwing handler does not stop the others; on() returns an unsubscribe', () => {
    const target = new EventTarget()
    const seen = []
    const original = console.error
    console.error = () => {}
    try {
        const router = createNodeEvents(target, { 'x:ping': () => { throw new Error('boom') } })
        const off = router.on('*:ping', () => seen.push('any'))
        target.dispatchEvent(new CustomEvent('ping', { detail: { nodeId: 'x' } }))
        off()
        target.dispatchEvent(new CustomEvent('ping', { detail: { nodeId: 'x' } }))
    } finally {
        console.error = original
    }
    assert.deepEqual(seen, ['any'])
})

test('emit dispatches a bubbling, composed event from an element or an event\'s currentTarget', () => {
    const el = new EventTarget()
    const got = []
    el.addEventListener('node-flow', (e) => got.push([e.detail.path, e.bubbles, e.composed]))
    el.addEventListener('click', (e) => emit(e, 'node-flow', { path: ['c'] }))
    emit(el, 'node-flow', { path: ['a', 'b'] })
    el.dispatchEvent(new Event('click'))
    assert.deepEqual(got, [[['a', 'b'], true, true], [['c'], true, true]])
})
