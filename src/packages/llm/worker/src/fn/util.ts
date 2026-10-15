/** Small pure helpers shared across fn/*.ts — kept in one place instead of copy-pasted per file. */

export const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const now = () => new Date().toISOString();
/** HTML → a flat text snippet for a prompt/knowledge line — collapses ALL markup + whitespace (unlike parse.ts's plainText, which only strips tag-shaped text and keeps a bare '<'/'>'). */
export const plain = (html: unknown) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
