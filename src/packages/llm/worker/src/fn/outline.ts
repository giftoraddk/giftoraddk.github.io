import type { FnSpec, Label } from './types.ts';

/** The part of a spec the browser may see: keys, labels, order, dependencies — the method (role/task/desc) stays here.
 *  `review` = who must sign off this department's result in its sector (registry.ts reviewOf) — the approve form asks
 *  for that sign-off up front; the Worker refuses an approve without it either way. `recordable` = this caller may save
 *  an approved result to `output.table` (/record — platform staff only); the client shows the save button by it. */
export function toOutline(spec: FnSpec, sector: { review?: Label | null; recordable?: boolean } = {}) {
  return {
    fn: spec.fn, kind: spec.kind, title: spec.title, description: spec.description, review: sector.review ?? null,
    recordable: !!sector.recordable,
    inputs: spec.inputs ?? [], needs: spec.needs ?? [], uses: spec.uses ?? [], output: spec.output ?? null,
    // Handoffs: kind, destination and which field keys make them up — never their objective text.
    produces: (spec.produces ?? []).map(p => ({ kind: p.kind, dest: p.dest, fields: p.fields })),
    steps: (spec.steps ?? []).map(s => ({
      id: s.id, key: s.key, vi: s.vi, en: s.en, type: s.type,
      calls: s.type === 'image' ? [] : (s.calls ?? []).map(c => ({
        key: c.key, vi: c.vi, en: c.en, dependsOn: c.dependsOn ?? [],
        fields: c.fields.map(f => ({ key: f.key, vi: f.vi, en: f.en, html: !!f.html, hidden: !!f.hidden })),
      })),
    })),
  };
}

export type Outline = ReturnType<typeof toOutline>;

export const allFieldKeys = (spec: FnSpec): string[] => [...new Set((spec.steps ?? []).flatMap(s =>
  s.type === 'image' ? ['imagePrompt', 'pics'] : (s.calls ?? []).flatMap(c => c.fields.map(f => f.key))))];
