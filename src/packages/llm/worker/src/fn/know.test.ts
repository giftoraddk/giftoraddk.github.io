import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knowFromApproved } from './know.ts';

test('a post becomes title + description + plain content; tags split on |', () => {
  const k = knowFromApproved({ table: 'posts', fields: ['title'], status: 'draft' },
    { title: 'Bài A', description: 'Mô tả', content: '<h2>H</h2><p>Nội dung</p>', tags: 'a|b' }, 'job1', true);
  assert.deepEqual(k, { id: 'job1', type: 'post', title: 'Bài A', description: 'Mô tả\n\nH Nội dung', tags: ['a', 'b'], meta: {}, status: 'draft' });
});

test('finance: the conclusion is the title, risk + decision go to meta, status follows the output', () => {
  const k = knowFromApproved({ table: 'finance_reports', fields: [], status: 'active' },
    { conclusion: 'Lãi', analysis: 'A', impact: 'I', recommendation: 'R', decision: 'GO', risk: 'GREEN' }, 'j', true);
  assert.deepEqual([k.type, k.title, k.description, k.meta, k.status], ['finance', 'Lãi', 'A\n\nI\n\nR\n\nGO', { risk: 'GREEN', decision: 'GO' }, 'active']);
});

test("a hub's result is active knowledge right away (it has no later publish step)", () => {
  assert.equal(knowFromApproved({ table: 'products', fields: [], status: 'draft' }, { title: 'X' }, 'j', false).status, 'active');
});
