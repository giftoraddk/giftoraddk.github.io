import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOverride, parseFace, parsePatch, stripCodeOwned } from './override.ts';
import { resolveSpec, sectorFaces } from './registry.ts';

const consult = resolveSpec('ecommerce', 'consult')!;
const marketing = resolveSpec('ecommerce', 'marketing')!;

test('a chat department takes a persona patch', () => {
  assert.equal(validateOverride(consult, { role: 'a warm {sector} advisor', principles: ['Be brief.'] }), null);
  assert.match(validateOverride(consult, { principles: ['x'.repeat(501)] })!, /principles/);
  assert.match(validateOverride(consult, { steps: [] })!, /no steps/);
});

test('code-owned keys are refused', () => {
  assert.match(validateOverride(marketing, { output: { table: 'users', fields: ['roles'] } })!, /"output" cannot be overridden/);
  assert.match(validateOverride(marketing, { inputs: ['x'] })!, /"inputs" cannot be overridden/);
  assert.match(validateOverride(marketing, {
    steps: [{ key: 'content', calls: [{ key: 'content', fields: [{ key: 'content', html: false }] }] }],
  })!, /"html" cannot be overridden/);
});

test('steps can be tuned, not invented; the merged pipeline must still run', () => {
  assert.equal(validateOverride(marketing, { steps: [{ key: 'analysis', calls: [{ key: 'g1', temperature: 0.2 }] }] }), null);
  assert.match(validateOverride(marketing, { steps: [{ key: 'nope' }] })!, /unknown step/);
  assert.match(validateOverride(marketing, { steps: [{ key: 'content', calls: [{ key: 'titleDesc', dependsOn: ['content'] }] }] })!, /dependsOn/);
  assert.match(validateOverride(marketing, { steps: [{ key: 'image', calls: [] }] })!, /image step/);
  assert.match(validateOverride(marketing, { role: 'x' })!, /no persona/);
  assert.match(validateOverride(marketing, { steps: [{ key: 'analysis', calls: [{ key: 'g1', fields: [{ key: 'pics' }] }] }] })!, /reserved/);
  assert.match(validateOverride(marketing, 'x')!, /object/);
});

test('a base html field cannot be removed', () => {
  // marketing's step 'content', call 'content', field 'content' is html: true.
  assert.match(validateOverride(marketing, {
    steps: [{ key: 'content', calls: [{ key: 'content', fields: [{ key: 'content', remove: true }] }] }],
  })!, /HTML field/);
  // Removing a field that isn't in output.fields is fine, as long as its call still has a field left.
  assert.equal(validateOverride(marketing, {
    steps: [{ key: 'analysis', calls: [{ key: 'g1', fields: [{ key: 'topicAnalysis', remove: true }] }] }],
  }), null);
});

test('a field key cannot be declared by two calls after the merge', () => {
  // "content" is already declared by step content's call "content" — reusing it on a brand-new call collides.
  assert.match(validateOverride(marketing, {
    steps: [{ key: 'strategy', calls: [{ key: 'newCall', fields: [{ key: 'content', desc: 'dup' }] }] }],
  })!, /declared by both/);
});

test('a reused call key in a DIFFERENT step still collides on the field key (not just the same call key twice)', () => {
  // step "content"'s call "content" already declares field "content" — a same-named call added to another
  // step must still be caught: keying by call name alone (the pre-fix bug) would treat them as "the same call".
  assert.match(validateOverride(marketing, {
    steps: [{ key: 'strategy', calls: [{ key: 'content', fields: [{ key: 'content', desc: 'dup' }] }] }],
  })!, /declared by both "strategy\/content" and "content\/content"/);
});

test('removing a step/call cannot drop an output field, except pics', () => {
  // step "content" produces title/description/content/tags, all in marketing's output.fields.
  assert.match(validateOverride(marketing, { steps: [{ key: 'content', remove: true }] })!, /drop output field/);
  // call "content" alone (within step "content") also produces the html "content" output field.
  assert.match(validateOverride(marketing, {
    steps: [{ key: 'content', calls: [{ key: 'content', remove: true }] }],
  })!, /drop output field/);
  // The image step only ever "produces" pics, which is explicitly exempt — removing it is fine.
  assert.equal(validateOverride(marketing, { steps: [{ key: 'image', remove: true }] }), null);
});

test('removing a single output field (not the whole step/call) is rejected too', () => {
  // "description" is one of marketing's output.fields — dropping just that field from call "titleDesc"
  // (which keeps its other field, "title") must fail the same way dropping the whole call does.
  assert.match(validateOverride(marketing, {
    steps: [{ key: 'content', calls: [{ key: 'titleDesc', fields: [{ key: 'description', remove: true }] }] }],
  })!, /output field "description" is no longer declared/);
});

test('parsePatch: a safe plain object from stored meta, else {}', () => {
  assert.deepEqual(parsePatch('{"role":"x"}'), { role: 'x' });
  assert.deepEqual(parsePatch('not json'), {});
  assert.deepEqual(parsePatch('[1,2]'), {});
  assert.deepEqual(parsePatch(null), {});
});

test('stripCodeOwned: drops only the code-owned keys', () => {
  assert.deepEqual(stripCodeOwned({ role: 'x', output: { table: 'y' }, inputs: ['a'], needs: ['product'], produces: [], fn: 'marketing', kind: 'pipeline' }), { role: 'x' });
});

test('validateOverride accepts a no-op (empty) patch for every sector x function registry.ts can resolve', () => {
  // Guards checkMerged's output-field check (item C) against a future sector/base spec whose own, un-overridden
  // shape it would wrongly reject — every real department must validate clean against itself.
  const all = sectorFaces().flatMap(sector => sector.functions.map(fn => ({ sector: sector.id, fn: fn.fn })));
  assert.ok(all.length > 0);
  for (const { sector, fn } of all) {
    const spec = resolveSpec(sector, fn);
    assert.ok(spec, `${sector}.${fn} should resolve`);
    assert.equal(validateOverride(spec!, {}), null, `${sector}.${fn}`);
  }
});

test('face: bounded text, https avatar, known status', () => {
  assert.deepEqual(parseFace({ title: ' Tư vấn ', status: 'inactive' }), { face: { title: 'Tư vấn', status: 'inactive' }, error: null });
  assert.match(parseFace({ pics: 'http://x/a.png' }).error!, /https/);
  assert.match(parseFace({ meta: '{}' }).error!, /cannot be set/);
  assert.deepEqual(parseFace(undefined), { face: {}, error: null });
});
