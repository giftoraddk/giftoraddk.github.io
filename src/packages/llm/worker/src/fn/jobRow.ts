/** A new job row's pieces — shared by POST /v1/fn/jobs (routes.ts) and the task routes (tasks.ts). Pure. */
import { LANGS, type FnSpec, type Rec } from './types.ts';
import { allFieldKeys } from './outline.ts';
import { str } from './util.ts';

export const TOPIC_MAX = 2000;
export const INPUT_MAX = 4000;

export const langOf = (v: unknown): string => (typeof v === 'string' && Object.hasOwn(LANGS, v) ? v : 'vi');

/** Every declared field empty, then the client-supplied inputs the spec declares (capped) — nothing else gets in. */
export function initialFields(spec: FnSpec, inputs: unknown): Rec {
  const fields: Rec = Object.fromEntries(allFieldKeys(spec).map(k => [k, '']));
  const given: Rec = inputs && typeof inputs === 'object' && !Array.isArray(inputs) ? (inputs as Rec) : {};
  for (const k of spec.inputs ?? []) {
    const v = str(given[k], INPUT_MAX);
    if (v) fields[k] = v;
  }
  return fields;
}

/** A job of task `task`: queued, owned by the caller (owner + the signed-in account). `trial` = the task's own flag. */
export function taskJobRow(p: {
  spec: FnSpec; division: string; sector: string; owner: string; userId: string; topic: string; language: string; task: string; inputs: unknown; at: string;
  trial: boolean;
}): Rec {
  return {
    kind: 'job', from: p.division, division: p.division, topic: p.topic, language: langOf(p.language), colors: '',
    status: 'queued', error: '', fields: initialFields(p.spec, p.inputs), approved: false,
    owner: p.owner, user_id: p.userId, sector: p.sector, task: p.task, reviewed: -1, waitingOnJobId: '', trial: p.trial, calls: '',
    created_at: p.at, updated_at: p.at, deleted_at: null,
  };
}
