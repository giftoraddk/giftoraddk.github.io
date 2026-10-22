import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseJsonObject, hasForeignScript } from './json-reply.js'

test('the last JSON object wins over reasoning text or a fence', () => {
    assert.deepEqual(parseJsonObject('thinking... {"a":1}'), { a: 1 })
    assert.deepEqual(parseJsonObject('```json\n{"a":{"b":2}}\n```'), { a: { b: 2 } })
    assert.equal(parseJsonObject('nope'), null)
    assert.equal(parseJsonObject('[1]'), null)
})

test('CJK in a Latin answer is caught, emoji is not', () => {
    assert.equal(hasForeignScript({ a: 'Xin chào 你好' }, 'Vietnamese'), true)
    assert.equal(hasForeignScript({ a: 'Xin chào 😊' }, 'Vietnamese'), false)
    assert.equal(hasForeignScript({ a: '你好' }, 'Chinese'), false)
})
