/**
 * How long a sector's group chat (svc-talk) keeps its data: chat lines, jobs and the task handoffs built from them.
 * Reads never return anything older (routes.ts listLog, talk.ts chat history), and a daily cron (index.ts scheduled)
 * deletes it for good. What an approved job wrote elsewhere — a post, a product, a finance report, knowledge — is the
 * business's own record and stays.
 */

export const RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

/** The oldest `created_at` still kept — ISO, like every created_at the Worker writes (string order = time order). */
export const retentionCutoff = (now = Date.now()): string => new Date(now - RETENTION_DAYS * DAY_MS).toISOString();

/**
 * Hard-deletes everything past the cutoff, in one batch (one transaction):
 *   1. every job of a task whose secretary job (its anchor, created first) has expired — a task goes as a whole, never
 *      left half-alive without its anchor (its view would 404)
 *   2. every other chat line / job past the cutoff
 *   3. handoffs whose task has no job left
 * → rows deleted per statement.
 */
export async function purgeExpired(db: D1Database, now = Date.now()): Promise<{ tasks: number; talks: number; artifacts: number }> {
  const cutoff = retentionCutoff(now);
  const [tasks, talks, artifacts] = await db.batch([
    db.prepare(
      `DELETE FROM talks WHERE task != '' AND task IN (
         SELECT task FROM talks WHERE kind = 'job' AND division LIKE '%.secretary' AND task != '' AND created_at < ?)`,
    ).bind(cutoff),
    db.prepare('DELETE FROM talks WHERE created_at < ?').bind(cutoff),
    db.prepare('DELETE FROM artifacts WHERE NOT EXISTS (SELECT 1 FROM talks t WHERE t.owner = artifacts.owner AND t.task = artifacts.task)'),
  ]);
  return { tasks: tasks.meta.changes ?? 0, talks: talks.meta.changes ?? 0, artifacts: artifacts.meta.changes ?? 0 };
}
