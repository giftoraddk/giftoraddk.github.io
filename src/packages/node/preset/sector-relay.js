// src/packages/node/preset/sector-relay.js
//
// The Secretary's relay on the canvas (sector.js, arc layout). A command to do the whole job or make a plan goes to
// the Secretary (<svc-ask> → its `chat`, the LEAD) and opens its panel: it frames the work into a task and routes it
// to the departments. From there each department's job of that task shows on the canvas only — no panel opens: the
// link Secretary → department stays lit, and the department shows as working (the spinning ring), for as long as its
// job runs; when its handoff comes back for review a short link runs department → Secretary.
// Read from the sector's chat service state (llm/service/talk.js writes conductor section `llm.<sector>`), so whichever
// panel drives the task (Secretary, a department) the canvas follows — nothing is fetched for it, and the service's
// code isn't loaded for it either.
import { subscribe } from '@/services/core/conductor.js';

const BACK_MS = 2200; // department → Secretary: its handoff waits for review

// A job's phase as the relay cares about it — status is the Worker's (D6).
const phaseOf = (job) => (job.approved ? 'approved'
    : job.error ? 'error'
    : job.status === 'awaiting_review' || job.status === 'done' ? 'review'
    : 'work');

/**
 * Pure: what changed since the last look. `seen` (job id → phase) is updated in place. For each task job of `sector`:
 *   { job, division, dir: 'out' }  — it is working now and wasn't before;
 *   { job, division, dir: 'back' } — it stopped working: its handoff is in for review;
 *   { job, division, dir: 'stop' } — it stopped working otherwise (approved, failed).
 * A job first seen already working is a new one — an interrupted one from an earlier visit carries an error
 * (llm/tool/divisions.js markInterrupted), so the log loading on page open lights nothing.
 */
export function relayHops(seen, log, sector) {
    const hops = [];
    for (const job of log ?? []) {
        if (job?.kind !== 'job' || !job.task || !String(job.division ?? '').startsWith(`${sector}.`)) continue;
        const phase = phaseOf(job);
        const prev = seen.get(job.id);
        if (prev === phase) continue;
        seen.set(job.id, phase);
        const hop = { job: job.id, division: job.division };
        if (phase === 'work') hops.push({ ...hop, dir: 'out' });
        else if (prev === 'work') hops.push({ ...hop, dir: phase === 'review' ? 'back' : 'stop' });
    }
    return hops;
}

/** Follows `sector`'s tasks on `flow`: `hub` = the Secretary's node id, `nodeOf(division)` = a department's node id.
 *  A department not on the canvas (Integration, one the user turned off) shows nothing. */
export function watchRelay({ flow, sector, hub, nodeOf }) {
    const seen = new Map();
    const working = new Map(); // job id → release() of its held link
    const has = (id) => flow.nodes.some((n) => n.id === id);
    return subscribe(`llm.${sector}`, (section) => {
        for (const { job, division, dir } of relayHops(seen, section?.log, sector)) {
            const node = nodeOf(division);
            if (dir === 'out') {
                if (has(hub) && has(node)) working.set(job, flow.holdLink(hub, node));
                continue;
            }
            working.get(job)?.();
            working.delete(job);
            if (dir === 'back' && has(hub) && has(node)) flow.link(node, hub, { duration: BACK_MS });
        }
    });
}
