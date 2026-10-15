/**
 * Allow-list HTML sanitizer for AI-written fields (content of posts/products) — the model can be steered by the topic
 * or by imported knowledge, so its HTML is untrusted. No DOM in Workers; a tag tokenizer is enough for an allow-list:
 * text is escaped, allowed tags are rebuilt from scratch with only their allowed attributes.
 */
const ALLOWED: Record<string, string[]> = {
  h2: [], h3: [], h4: [], p: [], br: [], ul: [], ol: [], li: [], strong: [], em: [], b: [], i: [], u: [], blockquote: [],
  table: [], thead: [], tbody: [], tr: [], th: [], td: [],
  a: ['href'], figure: ['data-media-wrap', 'data-align'], img: ['src', 'alt'],
};
const VOID = new Set(['br', 'img']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'textarea']);
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
const ATTR = /([a-zA-Z_:][\w:.-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export const escapeText = (s: string) =>
  s.replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;');

function safeUrl(name: string, value: string): boolean {
  const v = value.trim();
  if (name === 'href') return /^(https?:\/\/|\/(?!\/)|#)/i.test(v);
  if (name === 'src') return /^https:\/\//i.test(v);
  return true;
}

function attrsOf(tag: string, raw: string): string {
  let out = '';
  for (const m of raw.matchAll(ATTR)) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    if (!ALLOWED[tag].includes(name) || !safeUrl(name, value)) continue;
    out += ` ${name}="${escapeAttr(value)}"`;
  }
  if (tag === 'a' && out.includes(' href=')) out += ' rel="noopener nofollow"';
  return out;
}

export function sanitizeHtml(html: string): string {
  let out = '';
  let last = 0;
  let dropTag = '';
  let dropDepth = 0;
  for (const m of html.matchAll(TAG)) {
    const [whole, slash, rawName, rawAttrs] = m;
    const name = rawName.toLowerCase();
    const at = m.index ?? 0;
    if (!dropDepth) out += escapeText(html.slice(last, at));
    last = at + whole.length;
    if (dropDepth) {
      if (name === dropTag) dropDepth += slash ? -1 : 1;
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!slash && !rawAttrs.trim().endsWith('/')) { dropTag = name; dropDepth = 1; }
      continue;
    }
    if (!(name in ALLOWED)) continue;
    if (slash) {
      if (!VOID.has(name)) out += `</${name}>`;
      continue;
    }
    out += `<${name}${attrsOf(name, rawAttrs)}>`;
  }
  if (!dropDepth) out += escapeText(html.slice(last));
  return out;
}

/** The header image block the editor expects at the top of `content` (same markup as svc-editor). */
export const figureHtml = (src: string, alt: string) =>
  `<figure data-media-wrap="image" data-align="center"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"></figure>`;

export const stripLeadingFigure = (content: string) =>
  (content || '').replace(/^\s*<figure data-media-wrap="image"[^>]*>[\s\S]*?<\/figure>\s*/, '');
