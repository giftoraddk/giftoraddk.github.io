import type { OutputSpec, Rec } from './types.ts';
import { plain } from './util.ts';

export const TABLE_TYPE: Record<string, string> = { products: 'product', posts: 'post', finance_reports: 'finance' };

export interface ApprovedKnow { id: string; type: string; title: string; description: string; tags: string[]; meta: Rec; status: 'active' | 'draft' }

/** The `know` row an approved result becomes — the same content the client's know-sync.js builds from that record. */
export function knowFromApproved(out: OutputSpec, fields: Rec, id: string, platform: boolean): ApprovedKnow {
  const finance = out.table === 'finance_reports';
  const title = finance ? (plain(fields.conclusion) || '(untitled)').slice(0, 120) : plain(fields.title) || '(untitled)';
  const description = finance
    ? [fields.analysis, fields.impact, fields.recommendation, fields.decision].map(plain).filter(Boolean).join('\n\n')
    : [plain(fields.description), plain(fields.content)].filter(Boolean).join('\n\n');
  const meta: Rec = finance ? { risk: plain(fields.risk), decision: plain(fields.decision) } : {};
  // Platform records start as drafts and are published later in /admin (which re-syncs); a hub has no such step.
  const status = !platform || out.status === 'active' ? 'active' : 'draft';
  const tags = String(fields.tags ?? '').split('|').map(t => t.trim()).filter(Boolean);
  return { id, type: TABLE_TYPE[out.table] ?? 'other', title, description, tags, meta, status };
}
