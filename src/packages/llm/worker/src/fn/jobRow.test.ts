import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialFields, taskJobRow, langOf, INPUT_MAX } from './jobRow.ts';
import { resolveSpec } from './registry.ts';

test('a new job: every field empty, only the declared inputs, capped', () => {
  const finance = resolveSpec('ecommerce', 'finance')!;
  const f = initialFields(finance, { financialContext: 'x'.repeat(INPUT_MAX + 5), productContext: 'nope' });
  assert.equal(f.financialContext.length, INPUT_MAX);
  assert.equal('productContext' in f, false);
  assert.equal(f.conclusion, '');
  assert.equal(initialFields(finance, 'junk').financialContext, undefined);
});

test('a task job row: queued, owned by the caller, carries the task id, no record, no product wait', () => {
  const spec = resolveSpec('ecommerce', 'context')!;
  const row = taskJobRow({ spec, division: 'ecommerce.context', sector: 'ecommerce', owner: 'hub1', topic: 'Quà', language: 'xx', task: 't1', inputs: undefined, at: 'T' });
  assert.deepEqual([row.kind, row.status, row.owner, row.task, row.language, row.from, row.division], ['job', 'queued', 'hub1', 't1', 'vi', 'ecommerce.context', 'ecommerce.context']);
  assert.equal(row.fields.intent, '');
  assert.deepEqual([row.targetTable, row.waitingOnJobId, row.reviewed, row.approved], ['', '', -1, false]);
  assert.equal(langOf('en'), 'en');
});
