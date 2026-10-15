import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelope, compactArtifact, artifactFields, current, ENVELOPE_FIELD_MAX, ARTIFACT_PROMPT_MAX, HANDOFF_PROMPT_MAX, type ArtifactRow } from './artifacts.ts';
import type { Produces, Rec } from './types.ts';

const p: Produces = {
  kind: 'product.quality', dest: ['quality'], objective: 'Quality bar and failure modes.',
  fields: ['qualityBar', 'keyRisks', 'empty'], sections: { acceptance_criteria: ['qualityBar'], risks: ['keyRisks'], assumptions: ['keyRisks'] },
};

const row = (kind: string, status: ArtifactRow['status'], data: Rec, version = 1): ArtifactRow => ({
  id: `${kind}-${version}`, kind, version, status, source_fn: '', dest_fns: [], job_id: '', depends_on: [], supersedes: '',
  created_at: '2026-09-29T00:00:00.000Z', data,
});

test('envelope: every produced field in context, §17 lists from their fields, assumptions = tagged lines', () => {
  const e = envelope(p, { qualityBar: '- Box closes flush\n- No dents', keyRisks: '[HYPOTHESIS] Late supplier\nPlain risk', empty: ' ', other: 'x' }, ['context@v1'], 'user-1');
  assert.equal(e.objective, 'Quality bar and failure modes.');
  assert.deepEqual(Object.keys(e.context), ['qualityBar', 'keyRisks']);
  // Every §17 list item keeps its tag (null = the line made no evidence claim) — a hypothesis never reads as a fact.
  assert.deepEqual(e.acceptance_criteria, [{ text: 'Box closes flush', tag: null }, { text: 'No dents', tag: null }]);
  assert.deepEqual(e.risks, [{ text: 'Late supplier', tag: 'HYPOTHESIS' }, { text: 'Plain risk', tag: null }]);
  assert.deepEqual(e.assumptions, [{ text: 'Late supplier', tag: 'HYPOTHESIS' }]);
  assert.deepEqual(e.dependencies, ['context@v1']);
  assert.deepEqual(e.decisions, []);
  assert.deepEqual(e.tags, { FACT: 0, INFERENCE: 0, HYPOTHESIS: 1 });
  assert.equal(e.created_by, 'user-1');
  assert.equal(envelope(p, {}, []).created_by, '');
});

test('envelope strips markup and caps each field', () => {
  const e = envelope({ ...p, sections: {} }, { qualityBar: `<b>x</b>${'y'.repeat(ENVELOPE_FIELD_MAX)}` }, []);
  assert.equal(e.context.qualityBar.length, ENVELOPE_FIELD_MAX);
  assert.ok(!e.context.qualityBar.includes('<b>'));
});

test('current = the highest version that is not superseded', () => {
  const rows = [row('context', 'SUPERSEDED', {}, 1), row('context', 'APPROVED', {}, 2), row('routing', 'APPROVED', {})];
  assert.equal(current(rows, 'context')?.id, 'context-2');
  assert.equal(current(rows, 'nope'), undefined);
});

test('a handoff in a prompt = objective + capped fields; the set is capped, a changed one is flagged', () => {
  const data = { objective: 'Obj', context: { a: 'x'.repeat(900), b: 'short' } };
  assert.equal(compactArtifact(data), `Objective: Obj\n[A] ${'x'.repeat(699)}…\n[B] short`);
  assert.equal(compactArtifact(data, 21), 'Objective: Obj\n[A] x…');
  const rows = [
    row('context', 'APPROVED', { objective: 'C', context: { intent: '[FACT] gifts' } }),
    row('product.value', 'REQUIRES_VERIFICATION', { objective: 'V', context: { title: 'Box' } }),
    row('product.value', 'SUPERSEDED', { objective: 'OLD', context: {} }, 0),
  ];
  const f = artifactFields(rows, ['context', 'product.value', 'ops.package']);
  assert.deepEqual(Object.keys(f), ['artifact.context', 'artifact.product.value']);
  assert.equal(f['artifact.context'], 'Objective: C\n[INTENT] [FACT] gifts');
  assert.match(f['artifact.product.value'], /^\(Needs re-verification[^\n]*\)\nObjective: V\n\[TITLE\] Box$/);
  assert.deepEqual(Object.keys(artifactFields(rows, ['context', 'product.value'], 10)), ['artifact.context']);
});

test('a handoff shares its budget across fields: 13 fields of ~400 chars all keep their head within 3000', () => {
  const keys = Array.from({ length: 13 }, (_, i) => `field${i}`);
  const data = { objective: 'O'.repeat(250), context: Object.fromEntries(keys.map((k, i) => [k, `${k}-head ${'y'.repeat(380 + i)}`])) };
  const text = compactArtifact(data);
  assert.ok(text.length <= ARTIFACT_PROMPT_MAX, String(text.length));
  for (const k of keys) assert.match(text, new RegExp(`\n\\[${k.toUpperCase()}\\] ${k}-head y+…(\n|$)`), k);
  // A short field leaves its unused share to the long ones.
  const mixed = compactArtifact({ context: { a: 'a'.repeat(2000), b: 'tiny', c: 'c'.repeat(2000) } }, 1000);
  assert.ok(mixed.length <= 1000);
  assert.match(mixed, /\n\[B\] tiny\n/);
  assert.ok(mixed.length >= 990, String(mixed.length));
});

test('caps are hard maxima: ≤ 3000 per handoff (with the re-verification note), ≤ 7000 per call', () => {
  const big = (objective: string) => ({ objective, context: Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map(k => [k, 'z'.repeat(900)])) });
  assert.ok(compactArtifact(big('O')).length <= ARTIFACT_PROMPT_MAX);
  assert.ok(compactArtifact({ objective: 'O'.repeat(5000) }).length <= ARTIFACT_PROMPT_MAX);
  const rows = [
    row('context', 'REQUIRES_VERIFICATION', big('C')), row('product.value', 'REQUIRES_VERIFICATION', big('V')),
    row('product.spec', 'APPROVED', big('S')), row('marketing.demand', 'APPROVED', big('M')),
  ];
  const f = artifactFields(rows, ['context', 'product.value', 'product.spec', 'marketing.demand']);
  for (const v of Object.values(f)) assert.ok(v.length <= ARTIFACT_PROMPT_MAX, String(v.length));
  assert.ok(Object.values(f).reduce((n, v) => n + v.length, 0) <= HANDOFF_PROMPT_MAX);
  assert.match(f['artifact.context'], /^\(Needs re-verification/);
});
