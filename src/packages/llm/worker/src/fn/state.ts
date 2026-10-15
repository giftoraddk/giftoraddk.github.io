import type { CallSpec, Rec, StepSpec } from './types.ts';

const filled = (v: unknown) => String(v ?? '').trim() !== '';

/** The one AI call of an image step: translate the topic into an English scene for the text-to-image model. */
export const IMAGE_CONCEPT: Omit<CallSpec, 'contextKeys'> = {
  key: 'concept', vi: 'Mô tả ảnh', en: 'Image concept', maxTokens: 150, temperature: 0.7,
  role: 'an art director briefing a text-to-image model for an editorial header photo',
  task: 'Translate/interpret the TOPIC (it may be written in ANY language) into 1 concrete, concise ENGLISH visual description of a scene or object. Describe a SPECIFIC scene/object/product composition directly related to the topic — not a generic stock-photo cliche. Do NOT default to a portrait of a person (especially not gender-specific) unless the topic is literally about a specific person or profession. Describe items as PLAIN/UNBRANDED — never a brand name, logo, or visible text. 1 sentence, purely visual (no marketing language, no camera/lighting jargon).',
  fields: [{ key: 'imagePrompt', desc: '1 concise English sentence describing the visual scene/object.', max: 600 }],
};

export const callsOf = (step: StepSpec): CallSpec[] =>
  step.type === 'image' ? [{ ...IMAGE_CONCEPT, contextKeys: step.concept?.contextKeys ?? [] }] : step.calls ?? [];

/** Topo-sort calls by `dependsOn` into waves; calls of one wave run in parallel. */
export function orderCallWaves(calls: CallSpec[]): CallSpec[][] {
  const done = new Set<string>();
  const waves: CallSpec[][] = [];
  let remaining = [...calls];
  while (remaining.length) {
    const wave = remaining.filter(c => (c.dependsOn ?? []).every(k => done.has(k)));
    if (!wave.length) throw new Error('circular dependsOn in step config');
    wave.forEach(c => done.add(c.key));
    waves.push(wave);
    remaining = remaining.filter(c => !wave.includes(c));
  }
  return waves;
}

/** Done once any of its fields has data — one filled field counts the group as done (the old client rule). */
export const callDone = (call: CallSpec, fields: Rec) => call.fields.some(f => filled(fields[f.key]));

export function stepDone(step: StepSpec, fields: Rec, imageChoice: string): boolean {
  if (step.type === 'image') return imageChoice === 'skip' || filled(fields.pics);
  return (step.calls ?? []).every(c => callDone(c, fields));
}

export interface JobState { status: string; pausedStepId: string }

/** Where a job stands, from its data alone — the client never sets status. `reviewed` = last step approved past (-1 none). */
export function jobState(steps: StepSpec[], fields: Rec, imageChoice: string, reviewed: number): JobState {
  const open = steps.findIndex(s => !stepDone(s, fields, imageChoice));
  if (open === -1) return { status: 'done', pausedStepId: '' };
  const prev = open - 1;
  if (prev >= 0 && prev > reviewed && steps[prev].type === 'text') return { status: 'awaiting_review', pausedStepId: String(steps[prev].id) };
  const step = steps[open];
  if (step.type === 'image' && filled(fields.imagePrompt) && !imageChoice) return { status: 'awaiting_review', pausedStepId: String(step.id) };
  return { status: `step${step.id}`, pausedStepId: '' };
}

/**
 * Whether an /image call may run right now: paused waiting for the ai/skip choice, OR — 'ai' was already chosen but
 * without a pics URL yet (the client saves the choice, generates the image elsewhere, then attaches pics in a
 * follow-up call) — still sitting at the image step with its concept already generated. Without this second
 * branch, choosing 'ai' flips jobState off `awaiting_review` and every later call to attach pics gets rejected —
 * a deadlock. The post-`done` re-upload exception is handled by the caller (routes.ts), not here.
 */
export function imageGateOpen(steps: StepSpec[], fields: Rec, imageChoice: string, reviewed: number): boolean {
  const idx = steps.findIndex(s => s.type === 'image');
  if (idx === -1) return false;
  const id = String(steps[idx].id);
  const state = jobState(steps, fields, imageChoice, reviewed);
  return (state.status === 'awaiting_review' && state.pausedStepId === id) || (state.status === `step${id}` && filled(fields.imagePrompt));
}

/** A call may run (or re-run) once every step before it was reviewed and its `dependsOn` calls have data. */
export function canRunCall(steps: StepSpec[], stepIndex: number, call: CallSpec, fields: Rec, reviewed: number): boolean {
  if (stepIndex < 0 || stepIndex >= steps.length || stepIndex > reviewed + 1) return false;
  const siblings = callsOf(steps[stepIndex]);
  return (call.dependsOn ?? []).every(k => {
    const dep = siblings.find(c => c.key === k);
    return !!dep && callDone(dep, fields);
  });
}
