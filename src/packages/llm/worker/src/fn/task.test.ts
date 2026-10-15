import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, taskStage, buildTaskView, graphOf, availableOf, type GraphNode, type TaskJob, type FnStatus } from './task.ts';
import type { ArtifactRow } from './artifacts.ts';
import type { Rec } from './types.ts';

const graph: GraphNode[] = [
  { fn: 'context', needs: [], uses: [], produces: ['context'] },
  { fn: 'router', needs: ['context'], uses: [], produces: ['routing'] },
  { fn: 'product', needs: ['context'], uses: ['strategy.brief'], produces: ['product.value', 'product.spec'] },
  { fn: 'marketing', needs: ['context'], uses: ['product.value'], produces: ['marketing.demand'] },
  { fn: 'finance', needs: ['context'], uses: ['product.spec', 'ops.package'], produces: ['finance.economics'] },
];
const T = (h: number) => `2026-09-29T${String(h).padStart(2, '0')}:00:00.000Z`;
const art = (id: string, kind: string, status: ArtifactRow['status'] = 'APPROVED', data?: Rec): ArtifactRow =>
  ({ id, kind, version: 1, status, source_fn: '', dest_fns: [], job_id: '', depends_on: [], supersedes: '', created_at: T(1), data });
const job = (id: string, fn: string, status: string, approved = false, h = 1, fields?: Rec): TaskJob => ({ id, fn, status, approved, created_at: T(h), fields });
const states = (list: FnStatus[]) => Object.fromEntries(list.map(s => [s.fn, s.state]));
const ALL = ['context', 'router', 'product', 'marketing', 'finance'];

test('a new task: the context job runs, everything after it waits', () => {
  assert.deepEqual(states(schedule(graph, ['context', 'router'], [job('c', 'context', 'step1')], [])), { context: 'running', router: 'waiting' });
});

test('downstream waits for a planned producer, ignores an unplanned one, runs once its handoffs are approved', () => {
  const jobs = [job('c', 'context', 'done', true), job('r', 'router', 'done', true)];
  const rows = [art('a1', 'context'), art('a2', 'routing')];
  assert.deepEqual(states(schedule(graph, ALL, jobs, rows)), { context: 'approved', router: 'approved', product: 'runnable', marketing: 'waiting', finance: 'waiting' });
  assert.deepEqual(states(schedule(graph, ['context', 'router', 'marketing'], jobs, rows)), { context: 'approved', router: 'approved', marketing: 'runnable' });
  const withProduct = [...jobs, job('p', 'product', 'done', true, 2)];
  const later = [...rows, art('p1', 'product.value'), art('p2', 'product.spec')];
  assert.deepEqual(states(schedule(graph, ALL, withProduct, later)), { context: 'approved', router: 'approved', product: 'approved', marketing: 'runnable', finance: 'runnable' });
});

test('open jobs run or await review; a hard need nobody plans blocks; a changed handoff makes its producer stale', () => {
  const g: GraphNode[] = [...graph, { fn: 'quality', needs: ['product.quality'], uses: [], produces: [] }];
  const rows = [art('a1', 'context'), art('a2', 'routing'), art('p1', 'product.value', 'REQUIRES_VERIFICATION'), art('p2', 'product.spec')];
  const jobs = [job('c', 'context', 'done', true), job('r', 'router', 'done', true), job('p', 'product', 'done', true, 2), job('m', 'marketing', 'step2', false, 3)];
  const list = schedule(g, [...ALL, 'quality'], jobs, rows);
  assert.deepEqual(states(list), { context: 'approved', router: 'approved', product: 'stale', marketing: 'running', finance: 'runnable', quality: 'blocked' });
  assert.deepEqual(list.find(s => s.fn === 'quality')!.missing, ['product.quality']);
  assert.equal(list.find(s => s.fn === 'marketing')!.jobId, 'm');
  assert.deepEqual(states(schedule(graph, ['context'], [job('c', 'context', 'done')], [])), { context: 'review' });
});

test('stage: context → routing → running → done, with stale / blocked once nothing can move', () => {
  const s = (pairs: Record<string, FnStatus['state']>) => taskStage(Object.entries(pairs).map(([fn, state]) => ({ fn, state, jobId: '', missing: [] })));
  assert.equal(s({ context: 'review', router: 'waiting' }), 'context');
  assert.equal(s({ context: 'approved', router: 'running' }), 'routing');
  assert.equal(s({ context: 'approved', router: 'approved', product: 'runnable' }), 'running');
  assert.equal(s({ context: 'approved', router: 'approved', product: 'stale', marketing: 'approved' }), 'stale');
  assert.equal(s({ context: 'approved', router: 'approved', quality: 'blocked' }), 'blocked');
  assert.equal(s({ context: 'approved', router: 'approved', product: 'approved' }), 'done');
});

test('the view reads routing + plan from the live routing handoff and previews an unapproved router answer', () => {
  const fields = { activation: 'product:REQUIRED|marketing:RELEVANT|quality:RELEVANT|finance:RELEVANT', lead: 'product', complexity: 'standard' };
  const available = ['product', 'marketing', 'finance'];
  const jobs = [job('c', 'context', 'done', true), job('r', 'router', 'done', false, 2, fields)];
  const before = buildTaskView({ graph, available, jobs, rows: [art('a1', 'context')] });
  assert.equal(before.stage, 'routing');
  assert.equal(before.routing, null);
  assert.deepEqual(before.preview!.plan.run, ['product', 'marketing', 'finance']);
  const after = buildTaskView({
    graph, available, jobs: [jobs[0], { ...jobs[1], approved: true }],
    rows: [art('a1', 'context'), art('a2', 'routing', 'APPROVED', { context: fields })],
  });
  assert.equal(after.stage, 'running');
  assert.equal(after.preview, null);
  assert.deepEqual(after.next, ['product']);
  assert.deepEqual(after.plan!.unavailable, ['quality']);
});

test('the e-commerce graph comes from the specs: system steps + the three built functions', () => {
  assert.deepEqual(graphOf('ecommerce').map(n => n.fn), ['context', 'router', 'product', 'marketing', 'finance']);
  assert.deepEqual(graphOf('ecommerce').find(n => n.fn === 'marketing'),
    { fn: 'marketing', needs: ['context'], uses: ['product.value'], produces: ['marketing.insight', 'marketing.demand'] });
  assert.deepEqual(availableOf('ecommerce'), ['product', 'marketing', 'finance']);
  assert.deepEqual(graphOf('nowhere'), []);
});

test('stage: only running / review / runnable is progress — stale wins over what merely waits, waiting alone is blocked', () => {
  const s = (pairs: Record<string, FnStatus['state']>) => taskStage(Object.entries(pairs).map(([fn, state]) => ({ fn, state, jobId: '', missing: [] })));
  const sys = { context: 'approved', router: 'approved' } as const;
  assert.equal(s({ ...sys, product: 'stale', marketing: 'waiting', finance: 'waiting' }), 'stale');
  assert.equal(s({ ...sys, marketing: 'waiting' }), 'blocked');
  assert.equal(s({ ...sys, marketing: 'waiting', quality: 'blocked' }), 'blocked');
  assert.equal(s({ ...sys, product: 'review', marketing: 'waiting' }), 'running');
  assert.equal(s({ ...sys, product: 'stale', finance: 'runnable' }), 'running');
  assert.equal(s({ context: 'approved', router: 'stale', product: 'approved' }), 'stale');
});

test('a stuck task reports stale, not running forever: context v2 approved, product approved later and born REQUIRES_VERIFICATION', () => {
  const fields = { activation: 'product:REQUIRED|marketing:RELEVANT|finance:RELEVANT', lead: 'product', complexity: 'simple' };
  const jobs = [
    job('c1', 'context', 'done', true, 1), job('r', 'router', 'done', true, 2),
    job('p', 'product', 'done', true, 3), job('c2', 'context', 'done', true, 4),
  ];
  const rows: ArtifactRow[] = [
    { ...art('ctx1', 'context', 'SUPERSEDED') },
    { ...art('ctx2', 'context'), version: 2, created_at: T(5) },
    { ...art('rt', 'routing', 'REQUIRES_VERIFICATION', { context: fields }), depends_on: ['ctx1'] },
    { ...art('pv', 'product.value', 'REQUIRES_VERIFICATION'), depends_on: ['ctx2'], created_at: T(6) },
    { ...art('ps', 'product.spec', 'REQUIRES_VERIFICATION'), depends_on: ['ctx2'], created_at: T(6) },
  ];
  const view = buildTaskView({ graph, available: ['product', 'marketing', 'finance'], jobs, rows });
  assert.deepEqual(states(view.fns), { context: 'approved', router: 'stale', product: 'stale', marketing: 'waiting', finance: 'waiting' });
  assert.equal(view.stage, 'stale');
  assert.deepEqual(view.next, []);
});

test('next never opens a department from a stale plan while the router (or context) has an open job; the router itself opens once context is approved', () => {
  const fields = { activation: 'product:REQUIRED', lead: 'product', complexity: 'simple' };
  const available = ['product', 'marketing', 'finance'];
  const rows = [art('a1', 'context'), art('a2', 'routing', 'APPROVED', { context: fields })];
  const rerouting = buildTaskView({
    graph, available, rows,
    jobs: [job('c', 'context', 'done', true, 1), job('r1', 'router', 'done', true, 2), job('r2', 'router', 'step1', false, 3)],
  });
  assert.equal(rerouting.stage, 'routing');
  assert.equal(rerouting.fns.find(f => f.fn === 'product')!.state, 'runnable');
  assert.deepEqual(rerouting.next, []);
  const recontext = buildTaskView({
    graph, available, rows,
    jobs: [job('c', 'context', 'done', true, 1), job('r1', 'router', 'done', true, 2), job('c2', 'context', 'done', false, 3)],
  });
  assert.equal(recontext.stage, 'context');
  assert.deepEqual(recontext.next, []);
  const fresh = buildTaskView({ graph, available, rows: [art('a1', 'context')], jobs: [job('c', 'context', 'done', true, 1)] });
  assert.equal(fresh.stage, 'routing');
  assert.deepEqual(fresh.next, ['router']);
});
