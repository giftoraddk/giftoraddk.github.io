import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orderCallWaves, callDone, currentStep, pendingCalls, sameProgress } from './waves.js'

const outline = {
    steps: [
        { id: 1, key: 'analysis', type: 'text', calls: [
            { key: 'g1', dependsOn: [], fields: [{ key: 'a' }] },
            { key: 'g2', dependsOn: [], fields: [{ key: 'b' }] },
        ] },
        { id: 2, key: 'content', type: 'text', calls: [
            { key: 'titleDesc', dependsOn: [], fields: [{ key: 'title' }] },
            { key: 'content', dependsOn: ['titleDesc'], fields: [{ key: 'content' }] },
        ] },
        { id: 3, key: 'image', type: 'image', calls: [] },
    ],
}

test('waves follow dependsOn; a cycle throws', () => {
    assert.deepEqual(orderCallWaves(outline.steps[1].calls).map((w) => w.map((c) => c.key)), [['titleDesc'], ['content']])
    assert.throws(() => orderCallWaves([{ key: 'x', dependsOn: ['y'], fields: [] }, { key: 'y', dependsOn: ['x'], fields: [] }]), /circular/)
})

test('a call with one filled field is done; pending = the rest of the wave', () => {
    assert.equal(callDone(outline.steps[0].calls[0], { a: ' x ' }), true)
    assert.equal(callDone(outline.steps[0].calls[0], { a: '  ' }), false)
    assert.deepEqual(pendingCalls(outline.steps[0].calls, { a: 'x' }).map((c) => c.key), ['g2'])
})

test('the open step comes from the server status only', () => {
    assert.equal(currentStep(outline, { status: 'queued' }).key, 'analysis')
    assert.equal(currentStep(outline, { status: '' }).key, 'analysis')
    assert.equal(currentStep(outline, { status: 'step2' }).key, 'content')
    assert.equal(currentStep(outline, { status: 'step3' }).type, 'image')
    for (const status of ['done', 'awaiting_review', 'waiting_product']) assert.equal(currentStep(outline, { status }), null)
    assert.equal(currentStep(outline, { status: 'step2', approved: true }), null)
    assert.equal(currentStep(null, { status: 'queued' }), null)
})

test('sameProgress: a blank AI answer leaves status + the pending calls untouched', () => {
    const before = { status: 'step1', fields: { a: '', b: '' } }
    assert.equal(sameProgress(outline, before, { status: 'step1', fields: { a: '', b: '' } }), true)
    assert.equal(sameProgress(outline, before, { status: 'step1', fields: { a: 'x', b: '' } }), false) // 1 call vừa được điền = có tiến triển
    assert.equal(sameProgress(outline, before, { status: 'step2', fields: { a: '', b: '' } }), false) // status đã đổi
    const imgBefore = { status: 'step3', fields: { imagePrompt: '' } }
    assert.equal(sameProgress(outline, imgBefore, { status: 'step3', fields: { imagePrompt: '' } }), true)
    assert.equal(sameProgress(outline, imgBefore, { status: 'step3', fields: { imagePrompt: 'a cozy gift box' } }), false)
    assert.equal(sameProgress(outline, { status: 'done' }, { status: 'done' }), false) // không có step hiện hành — không phải việc của hàm này
})
