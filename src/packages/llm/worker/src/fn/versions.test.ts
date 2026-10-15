import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downstreamOf, approveArtifacts, verifyArtifact, type ArtifactRow } from './artifacts.ts';
import type { FnSpec } from './types.ts';

const T0 = '2026-09-29T10:00:00.000Z';
const T1 = '2026-09-29T11:00:00.000Z';
const T2 = '2026-09-29T12:00:00.000Z';
const row = (id: string, kind: string, version: number, status: ArtifactRow['status'], depends_on: string[] = [], created_at = T0): ArtifactRow =>
  ({ id, kind, version, status, source_fn: kind.split('.')[0], dest_fns: [], job_id: '', depends_on, supersedes: '', created_at });

const product: FnSpec = {
  fn: 'product', kind: 'pipeline', title: { vi: 'P', en: 'P' }, needs: ['context'],
  produces: [
    { kind: 'product.value', dest: ['marketing'], objective: 'Value', fields: ['title'] },
    { kind: 'product.spec', dest: ['finance'], objective: 'Spec', fields: ['productConcept'] },
  ],
};

let n = 0;
const newId = () => `new${++n}`;

test('first approve: v1 of each kind, APPROVED, built on the live upstream', () => {
  n = 0;
  const plan = approveArtifacts({
    spec: product, job: { id: 'j1', fields: { title: 'Box', productConcept: 'A box' }, created_at: T1 },
    rows: [row('ctx1', 'context', 1, 'APPROVED')], at: T2, newId,
  });
  assert.deepEqual(plan.inserts.map(a => [a.id, a.kind, a.version, a.status, a.depends_on, a.supersedes, a.source_fn, a.job_id]), [
    ['new1', 'product.value', 1, 'APPROVED', ['ctx1'], '', 'product', 'j1'],
    ['new2', 'product.spec', 1, 'APPROVED', ['ctx1'], '', 'product', 'j1'],
  ]);
  assert.deepEqual(plan.inserts[0].data?.dependencies, ['context@v1']);
  assert.deepEqual(plan.inserts[0].data?.context, { title: 'Box' });
  assert.deepEqual([plan.superseded, plan.toVerify], [[], []]);
});

test('re-approve: v2 supersedes v1; everything built on v1 — directly or not — needs re-verification', () => {
  n = 0;
  const rows = [
    row('ctx1', 'context', 1, 'APPROVED'),
    row('pv1', 'product.value', 1, 'APPROVED', ['ctx1']),
    row('ps1', 'product.spec', 1, 'APPROVED', ['ctx1']),
    row('md1', 'marketing.demand', 1, 'APPROVED', ['ctx1', 'pv1']),
    row('fe1', 'finance.economics', 1, 'APPROVED', ['ctx1', 'md1']),
    row('mi1', 'marketing.insight', 1, 'APPROVED', ['ctx1']),
  ];
  const plan = approveArtifacts({ spec: product, job: { id: 'j2', fields: {}, created_at: T1 }, rows, at: T2, newId });
  assert.deepEqual(plan.inserts.map(a => [a.kind, a.version, a.supersedes]), [['product.value', 2, 'pv1'], ['product.spec', 2, 'ps1']]);
  assert.deepEqual(plan.superseded, ['pv1', 'ps1']);
  assert.deepEqual([...plan.toVerify].sort(), ['fe1', 'md1']);
});

test('a version is born REQUIRES_VERIFICATION when its upstream changed while the job ran, or awaits verification', () => {
  n = 0;
  const newer = [row('ctx2', 'context', 2, 'APPROVED', [], T2)];
  assert.equal(approveArtifacts({ spec: product, job: { id: 'j3', fields: {}, created_at: T1 }, rows: newer, at: T2, newId }).inserts[0].status, 'REQUIRES_VERIFICATION');
  const shaky = [row('ctx1', 'context', 1, 'REQUIRES_VERIFICATION')];
  assert.equal(approveArtifacts({ spec: product, job: { id: 'j4', fields: {}, created_at: T1 }, rows: shaky, at: T2, newId }).inserts[0].status, 'REQUIRES_VERIFICATION');
});

test('verify: approved again against the live upstream; refused while that upstream is not approved', () => {
  const rows = [
    row('pv1', 'product.value', 1, 'SUPERSEDED'), row('pv2', 'product.value', 2, 'APPROVED', [], T2),
    row('md1', 'marketing.demand', 1, 'REQUIRES_VERIFICATION', ['pv1']),
  ];
  assert.deepEqual(verifyArtifact(rows, 'md1'), { depends_on: ['pv2'], dependencies: ['product.value@v2'] });
  assert.deepEqual(verifyArtifact(rows, 'pv2'), { error: 'Nothing to verify' });
  const shaky = [rows[0], row('pv2', 'product.value', 2, 'REQUIRES_VERIFICATION'), rows[2]];
  assert.match((verifyArtifact(shaky, 'md1') as { error: string }).error, /upstream/);
});

test('downstreamOf skips superseded rows and the changed ones themselves', () => {
  const rows = [row('a', 'x', 1, 'APPROVED'), row('b', 'y', 1, 'SUPERSEDED', ['a']), row('c', 'z', 1, 'APPROVED', ['a'])];
  assert.deepEqual(downstreamOf(rows, ['a']), ['c']);
});

const graph = [
  { fn: 'context', needs: [], uses: [] },
  { fn: 'product', needs: ['context'], uses: ['strategy.brief'] },
  { fn: 'marketing', needs: ['context'], uses: ['product.value'] },
  { fn: 'finance', needs: ['context'], uses: ['product.spec', 'marketing.demand'] },
];

test('a first-time upstream flags consumers already approved without it; a later version does not re-apply that rule', () => {
  n = 0;
  const rows = [
    row('ctx1', 'context', 1, 'APPROVED'),
    row('mi1', 'marketing.insight', 1, 'APPROVED', ['ctx1']),
    row('md1', 'marketing.demand', 1, 'APPROVED', ['ctx1']),
    row('fe1', 'finance.economics', 1, 'APPROVED', ['ctx1', 'md1']),
    row('old', 'marketing.demand', 0, 'SUPERSEDED', ['ctx1']),
  ];
  const plan = approveArtifacts({ spec: product, job: { id: 'j1', fields: {}, created_at: T1 }, rows, at: T2, newId, graph, by: 'u1' });
  assert.deepEqual(plan.superseded, []);
  assert.deepEqual([...plan.toVerify].sort(), ['fe1', 'md1', 'mi1']);
  assert.equal(plan.inserts[0].data?.created_by, 'u1');
  // Without a graph (or when no consumer is live) nothing extra is flagged.
  assert.deepEqual(approveArtifacts({ spec: product, job: { id: 'j1', fields: {}, created_at: T1 }, rows, at: T2, newId }).toVerify, []);
  // product.value v1 already exists: only the supersede path applies (md1 built on pv1 → flagged; mi1 is not).
  const again = [...rows, row('pv1', 'product.value', 1, 'APPROVED', ['ctx1']), row('ps1', 'product.spec', 1, 'APPROVED', ['ctx1'])];
  again[2] = { ...again[2], depends_on: ['ctx1', 'pv1'] };
  const re = approveArtifacts({ spec: product, job: { id: 'j2', fields: {}, created_at: T1 }, rows: again, at: T2, newId, graph });
  assert.deepEqual([...re.toVerify].sort(), ['fe1', 'md1']);
});

test('downstreamOf terminates on a cycle and reaches a diamond sink once', () => {
  const cyc = [row('a', 'x', 1, 'APPROVED', ['c']), row('b', 'y', 1, 'APPROVED', ['a']), row('c', 'z', 1, 'APPROVED', ['b'])];
  assert.deepEqual([...downstreamOf(cyc, ['a'])].sort(), ['b', 'c']);
  const diamond = [
    row('top', 't', 1, 'APPROVED'), row('l', 'l', 1, 'APPROVED', ['top']), row('r', 'r', 1, 'APPROVED', ['top']),
    row('sink', 's', 1, 'APPROVED', ['l', 'r']),
  ];
  const hit = downstreamOf(diamond, ['top']);
  assert.deepEqual([...hit].sort(), ['l', 'r', 'sink']);
  assert.equal(hit.length, 3);
});

test('verify records a first-time upstream the artifact was flagged for (the kinds its producer reads)', () => {
  const rows = [row('ctx1', 'context', 1, 'APPROVED'), row('pv1', 'product.value', 1, 'APPROVED'), row('md1', 'marketing.demand', 1, 'REQUIRES_VERIFICATION', ['ctx1'])];
  assert.deepEqual(verifyArtifact(rows, 'md1', ['context', 'product.value', 'ops.package']),
    { depends_on: ['ctx1', 'pv1'], dependencies: ['context@v1', 'product.value@v1'] });
  assert.deepEqual(verifyArtifact(rows, 'md1'), { depends_on: ['ctx1'], dependencies: ['context@v1'] });
  const shaky = [rows[0], row('pv1', 'product.value', 1, 'REQUIRES_VERIFICATION'), rows[2]];
  assert.match((verifyArtifact(shaky, 'md1', ['context', 'product.value']) as { error: string }).error, /upstream/);
});
