import { runChain, clampOpts, MAX_ATTEMPTS, type AiEnv } from '../ai';
import { HttpError } from '../lib/http';
import { parseJsonObject, hasForeignScript } from './parse.ts';
import type { Rec } from './types.ts';

// The whole rotation stays under the client's 90s wait (service/fn-api.js AI_MS) — a model starts only while there is
// time left for it, so the client gets a clear 502 instead of timing out itself.
const BUDGET_MS = 70_000;

/**
 * One JSON answer: runChain rotates through up to MAX_ATTEMPTS (9) different models, best-ranked first — a broken or
 * mixed-script reply counts as that model's turn and the next model gets one. All 9 fail → 502.
 */
export async function generateJson(env: AiEnv, p: { system: string; user: string; maxTokens?: number; temperature?: number; languageName: string; budgetMs?: number }): Promise<Rec> {
  const opts = clampOpts({ system: p.system, maxTokens: p.maxTokens, temperature: p.temperature });
  const got: { obj: Rec | null } = { obj: null };
  const accept = (text: string) => {
    const obj = parseJsonObject(text);
    if (!obj || hasForeignScript(obj, p.languageName)) return false;
    got.obj = obj;
    return true;
  };
  await runChain(env, '@default', [{ role: 'user', content: p.user }], opts, Date.now() + Math.min(p.budgetMs ?? BUDGET_MS, BUDGET_MS), accept);
  if (got.obj) return got.obj;
  console.warn(`[fn] no usable JSON after ${MAX_ATTEMPTS} models`);
  throw new HttpError(502, 'The AI did not return a usable answer — please retry');
}
