import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerChannel, publish, subscribe, once, registerHandler, bridgeDomEvent } from './bus.js'

const quiet = (fn) => {
    const { warn, error } = console
    console.warn = console.error = () => {}
    try { return fn() } finally { Object.assign(console, { warn, error }) }
}

test('channel names must be "<scope>:<name>" — wildcards and bare names are refused', () => {
    quiet(() => {
        for (const bad of ['*', 'ping', ':x', 'a:*', 'A:b', 'a b:c']) assert.equal(registerChannel(bad), false)
        assert.equal(publish('t:never-registered', {}), false)
        assert.equal(typeof subscribe('t:never-registered', () => {}), 'function')
    })
    assert.equal(registerChannel('t:ok'), true)
})

test('payload is a deep-frozen copy: subscribers cannot reach back into the publisher', () => {
    registerChannel('t:freeze')
    const source = { list: [1, 2], nested: { n: 1 } }
    let got
    subscribe('t:freeze', (d) => { got = d })
    publish('t:freeze', source)
    assert.notEqual(got, source)
    assert.ok(Object.isFrozen(got.nested) && Object.isFrozen(got.list))
    assert.throws(() => { got.nested.n = 2 }, TypeError)
    assert.equal(source.nested.n, 1)
    assert.equal(Object.isFrozen(source), false)
})

test('schema runs on the sealed copy — a getter cannot pass validation and then change', () => {
    registerChannel('t:toctou', { schema: (d) => d?.role === 'guest' })
    let reads = 0
    const tricky = { get role() { return reads++ === 0 ? 'guest' : 'admin' } }
    let got
    subscribe('t:toctou', (d) => { got = d })
    publish('t:toctou', tricky)
    assert.equal(got.role, 'guest')
    assert.equal(got.role, 'guest')
})

test('non-cloneable payloads (functions, proxies) and throwing schemas are rejected', () => {
    registerChannel('t:plain', { schema: () => { throw new Error('boom') } })
    registerChannel('t:clone')
    const seen = []
    subscribe('t:plain', () => seen.push('plain'))
    subscribe('t:clone', () => seen.push('clone'))
    quiet(() => {
        assert.equal(publish('t:plain', { a: 1 }), false)
        assert.equal(publish('t:clone', { fn: () => {} }), false)
        assert.equal(publish('t:clone', new Proxy({}, {})), false)
    })
    assert.deepEqual(seen, [])
})

test('a throwing or rejecting handler does not starve the others and is reported on app:error', async () => {
    registerChannel('t:isolate')
    const seen = []
    const errors = []
    const offErr = subscribe('app:error', (d) => errors.push(d.channel))
    subscribe('t:isolate', () => { throw new Error('sync') })
    subscribe('t:isolate', async () => { throw new Error('async') })
    subscribe('t:isolate', () => seen.push('ok'))
    const { error } = console
    console.error = () => {}
    try {
        publish('t:isolate', {})
        await new Promise((r) => setTimeout(r))
    } finally {
        console.error = error
    }
    offErr()
    assert.deepEqual(seen, ['ok'])
    assert.deepEqual(errors, ['t:isolate', 't:isolate'])
})

test('once() fires a single time and unsubscribing mid-dispatch keeps the neighbours', () => {
    registerChannel('t:once')
    const seen = []
    once('t:once', () => seen.push('once'))
    subscribe('t:once', () => seen.push('always'))
    publish('t:once', 1)
    publish('t:once', 2)
    assert.deepEqual(seen, ['once', 'always', 'always'])
})

test('registerHandler keeps exactly one business handler per channel', () => {
    registerChannel('t:cmd')
    const seen = []
    registerHandler('t:cmd', () => seen.push('first'))
    quiet(() => registerHandler('t:cmd', () => seen.push('second')))
    publish('t:cmd', {})
    assert.deepEqual(seen, ['first'])
})

test('bridgeDomEvent needs a schema, is idempotent, and drops invalid DOM details', () => {
    const target = new EventTarget()
    registerChannel('t:loose')
    registerChannel('t:bridge', { schema: (d) => typeof d?.text === 'string' })
    const seen = []
    subscribe('t:bridge', (d) => seen.push(d.text))
    quiet(() => bridgeDomEvent('loose-evt', 't:loose', undefined, target))
    const off = bridgeDomEvent('say', 't:bridge', undefined, target)
    bridgeDomEvent('say', 't:bridge', undefined, target)
    quiet(() => {
        target.dispatchEvent(new CustomEvent('say', { detail: { text: 'hi' } }))
        target.dispatchEvent(new CustomEvent('say', { detail: { text: 42 } }))
    })
    off()
    target.dispatchEvent(new CustomEvent('say', { detail: { text: 'after' } }))
    assert.deepEqual(seen, ['hi'])
})
