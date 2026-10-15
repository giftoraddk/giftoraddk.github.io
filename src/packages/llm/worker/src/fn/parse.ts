import type { FieldSpec, Rec } from './types.ts';
import { sanitizeHtml } from './sanitize.ts';

/** Reasoning models print thoughts before the JSON — the real answer is the LAST {...} block that parses. */
export function parseJsonObject(raw: string): Rec | null {
  const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const end = text.lastIndexOf('}');
  for (let i = text.lastIndexOf('{', end); end !== -1 && i !== -1; i = i > 0 ? text.lastIndexOf('{', i - 1) : -1) {
    try {
      const parsed = JSON.parse(text.slice(i, end + 1));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Rec;
    } catch { /* try the next opening brace to the left */ }
  }
  return null;
}

// `u` flag: without it the 豈-﫿 range also matches the surrogate halves every emoji is encoded with.
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힣豈-﫿]/u;
const CJK_LANGS = new Set(['Chinese', 'Japanese', 'Korean']);

export function hasForeignScript(obj: Rec, languageName: string): boolean {
  if (CJK_LANGS.has(languageName)) return false;
  return Object.values(obj).some(v => typeof v === 'string' && CJK.test(v));
}

export const FIELD_MAX = 20_000;

// A non-html field must never carry markup, but plain '<'/'>' as math/comparison symbols are legitimate content
// (e.g. "Margin < 10%") — only strip text shaped like an (optionally unclosed) HTML tag, e.g. <img ... onerror=.
export const plainText = (s: string) => s.replace(/<\/?[a-zA-Z!?][^>]*>?/g, '');

/** Only the declared keys, as trimmed strings within their cap — HTML fields go through the sanitizer, plain ones lose all markup. */
export function pickFields(obj: Rec, fields: FieldSpec[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const value = typeof obj[f.key] === 'string' ? obj[f.key].trim().slice(0, f.max ?? FIELD_MAX) : '';
    out[f.key] = f.html ? sanitizeHtml(value) : plainText(value);
  }
  return out;
}
