import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    canonicalDivision, sectorOfDivision, legacyNodeId, sectorDivisions, findFunction, productFirst, visibleLog, markInterrupted, displayTitle,
    systemDivisions,
} from './divisions.js'

const SECTORS = [{
    id: 'ecommerce',
    functions: [
        { id: 'ecommerce.product', fn: 'product', kind: 'pipeline', title: { vi: 'Sản phẩm', en: 'Product' }, name: '', about: '', pics: '', status: 'active', lang: 'vi' },
        { id: 'ecommerce.marketing', fn: 'marketing', kind: 'pipeline', title: { vi: 'Marketing', en: 'Marketing' }, name: 'Tiếp thị', about: 'SEO', pics: 'https://p', status: 'active', lang: 'vi' },
        { id: 'ecommerce.consult', fn: 'consult', kind: 'chat', title: { vi: 'Tư vấn', en: 'Consult' }, name: '', about: '', pics: '', status: 'inactive', lang: 'vi' },
    ],
}]

test('legacy ids map onto the e-commerce sector; node ids stay the old ones', () => {
    assert.equal(canonicalDivision('production'), 'ecommerce.product')
    assert.equal(canonicalDivision('sale'), 'ecommerce.consult')
    assert.equal(canonicalDivision('ecommerce.finance'), 'ecommerce.finance')
    assert.equal(sectorOfDivision('marketing'), 'ecommerce')
    assert.equal(legacyNodeId('ecommerce.consult'), 'aide')
    assert.equal(legacyNodeId('education.product'), 'education.product')
})

test('a sector lists its active departments with display names; lookups accept legacy ids', () => {
    const list = sectorDivisions(SECTORS, 'ecommerce', 'en')
    assert.deepEqual(list.map((d) => [d.id, d.title]), [['ecommerce.product', 'Product'], ['ecommerce.marketing', 'Tiếp thị']])
    assert.equal(list[1].description, 'SEO')
    assert.equal(list[0].outline, null)
    assert.equal(findFunction(SECTORS, 'aide').id, 'ecommerce.consult')
    assert.equal(displayTitle(findFunction(SECTORS, 'production'), 'vi'), 'Sản phẩm')
})

test('product first, waiting jobs hidden, interrupted jobs flagged in RAM only', () => {
    assert.deepEqual(productFirst([{ fn: 'marketing' }, { fn: 'product' }], (d) => d.fn).map((d) => d.fn), ['product', 'marketing'])
    const log = [{ kind: 'chat' }, { kind: 'job', status: 'waiting_product' }, { kind: 'job', status: 'done' }]
    assert.equal(visibleLog(log).length, 2)
    assert.equal(markInterrupted({ kind: 'job', status: 'step2', error: '' }, 'X').error, 'X')
    assert.equal(markInterrupted({ kind: 'job', status: 'awaiting_review', error: '' }, 'X').error, '')
    assert.equal(markInterrupted({ kind: 'job', status: 'queued', approved: true, error: '' }, 'X').error, '')
})

test('system steps of a sector are named but flagged — never offered as a department to message', () => {
    const sectors = [{ id: 'ecommerce', functions: [], system: [{ id: 'ecommerce.coordinator', fn: 'coordinator', kind: 'chat', title: { vi: 'Điều phối', en: 'Coordinator' } }] }]
    assert.deepEqual(systemDivisions(sectors, 'ecommerce', 'en').map((d) => [d.id, d.title, d.system]), [['ecommerce.coordinator', 'Coordinator', true]])
    assert.deepEqual(systemDivisions(sectors, 'fnb'), [])
})
