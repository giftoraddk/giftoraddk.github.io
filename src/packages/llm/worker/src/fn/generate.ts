import { runChain, clampOpts, type AiEnv } from '../ai';
import { HttpError } from '../lib/http';
import { parseJsonObject, hasForeignScript } from './parse.ts';
import type { Rec } from './types.ts';

const ATTEMPTS = 6;
// The whole retry loop stays under the client's 90s wait (service/fn-api.js AI_MS) — a round starts only while there is
// time left for it, so the client gets a clear 502 instead of timing out itself.
const BUDGET_MS = 70_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One JSON answer; a broken/mixed-script reply is retried (a new try often lands on another model), up to 6 tries.
 * A round where every model failed (mostly free-tier 429s) waits a little longer each time before the next one.
 */
export async function generateJson(env: AiEnv, p: { system: string; user: string; maxTokens?: number; temperature?: number; languageName: string }): Promise<Rec> {
  const opts = clampOpts({ system: p.system, maxTokens: p.maxTokens, temperature: p.temperature });
  const deadline = Date.now() + BUDGET_MS;
  for (let attempt = 1; attempt <= ATTEMPTS && Date.now() < deadline; attempt++) {
    const text = await runChain(env, '@default', [{ role: 'user', content: p.user }], opts);
    if (text == null) {
      console.warn(`[fn] attempt ${attempt}/${ATTEMPTS}: every model failed`);
      await sleep(Math.min(2000 * attempt, Math.max(0, deadline - Date.now())));
      continue;
    }
    const obj = parseJsonObject(text);
    if (obj && !hasForeignScript(obj, p.languageName)) return obj;
    console.warn(`[fn] attempt ${attempt}/${ATTEMPTS} gave no usable JSON`);
  }
  throw new HttpError(502, 'The AI did not return a usable answer — please retry');
}
