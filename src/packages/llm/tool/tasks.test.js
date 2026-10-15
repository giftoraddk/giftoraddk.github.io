import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planSummary, previewSummary, stageLine, taskIdsOf, staleFor, fnName } from './tasks.js'

const titles = {
    product: { vi: 'Sản phẩm & Đổi mới', en: 'Product & Innovation' },
    marketing: { vi: 'Marketing & Tăng trưởng', en: 'Marketing & Growth' },
    quality: { vi: 'Chất lượng & Hiệu suất', en: 'Quality & Performance' },
    supply: { vi: 'Cung ứng & Mua hàng', en: 'Supply & Procurement' },
}
const kinds = { 'product.quality': { vi: 'Yêu cầu chất lượng sản phẩm', en: 'Product quality requirements' } }
const plan = { run: ['product', 'marketing'], unavailable: ['quality'], skipped: [{ fn: 'supply', level: 'NOT_MATERIAL', reason: 'not_material' }] }
const routing = { lead: 'product', complexity: 'standard', levels: {}, rated: [] }
const view = { id: 't1', stage: 'running', routing, plan, preview: null, titles, kinds, fns: [], artifacts: [] }
const face = (fn) => (fn === 'product' ? 'Sản phẩm' : '')

test('the plan line names the lead, the depth, who works, who is missing and who is skipped', () => {
    assert.equal(planSummary(view, face, 'vi'), [
        'Phân công xong — chủ trì: Sản phẩm; độ sâu: tiêu chuẩn. Sẽ làm: Sản phẩm, Marketing & Tăng trưởng.',
        'Chưa có phòng: Chất lượng & Hiệu suất — phần bàn giao của họ sẽ thiếu.',
        'Lần này không làm: Cung ứng & Mua hàng (không trọng yếu).',
    ].join('\n'))
    assert.equal(planSummary({ ...view, routing: null }, face), '')
    assert.match(previewSummary({ ...view, routing: null, plan: null, preview: { routing, plan } }, face, 'en'), /^Routing proposal — lead: Sản phẩm; depth: standard\./)
    assert.equal(previewSummary(view, face), '')
})

test('the coordinator speaks only when the stage changes', () => {
    assert.equal(stageLine(undefined, { ...view, stage: 'context' }, face), '')
    assert.equal(stageLine('context', { ...view, stage: 'routing' }, face), 'Bối cảnh đã chốt ✅ — giờ em phân công các phòng.')
    assert.match(stageLine('routing', view, face), /^Phân công xong/)
    assert.equal(stageLine('running', view, face), '')
    assert.match(stageLine('running', { ...view, stage: 'done' }, face), /Xong cả kế hoạch/)
    const blocked = { ...view, stage: 'blocked', fns: [{ fn: 'quality', state: 'blocked', jobId: '', missing: ['product.quality'] }] }
    assert.equal(stageLine('running', blocked, face), '⛔ Chưa chạy được: Chất lượng & Hiệu suất (thiếu Yêu cầu chất lượng sản phẩm).')
    const stale = { ...view, stage: 'stale', fns: [{ fn: 'marketing', state: 'stale', jobId: 'm', missing: [] }] }
    assert.match(stageLine('running', stale, face, 'en'), /^⚠️ Needs re-checking: Marketing & Growth/)
})

test('tasks to reload: open ones first, then the newest, capped', () => {
    const log = [
        { kind: 'job', task: 'a', approved: true }, { kind: 'chat' }, { kind: 'job', task: 'b', approved: false },
        { kind: 'job', task: 'c', approved: true }, { kind: 'job', task: '', approved: false }, { kind: 'job', task: 'a', approved: true },
    ]
    assert.deepEqual(taskIdsOf(log), ['b', 'a', 'c'])
    assert.deepEqual(taskIdsOf(log, 1), ['b'])
})

test('stale handoffs show only on the latest job of that function', () => {
    const v = {
        fns: [{ fn: 'marketing', state: 'stale', jobId: 'm2', missing: [] }],
        artifacts: [
            { id: 'x', source_fn: 'marketing', status: 'REQUIRES_VERIFICATION' }, { id: 'y', source_fn: 'marketing', status: 'APPROVED' },
            { id: 'z', source_fn: 'product', status: 'REQUIRES_VERIFICATION' },
        ],
    }
    assert.deepEqual(staleFor(v, { id: 'm2', division: 'ecommerce.marketing' }).map((a) => a.id), ['x'])
    assert.deepEqual(staleFor(v, { id: 'm1', division: 'ecommerce.marketing' }), [])
    assert.deepEqual(staleFor(null, { id: 'm2', division: 'ecommerce.marketing' }), [])
    assert.equal(fnName(v, 'finance', () => '', 'en'), 'finance')
})
