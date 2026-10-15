import { HttpError } from './http.ts';

export type Rec = Record<string, any>;

export const BODY_MAX = 64 * 1024; // default cap — public/guest routes (aide, search, mcp relay's one JSON-RPC message)
export const JOB_BODY_MAX = 128 * 1024; // signed-in job routes (jobs/log/chat) — a step's instruction plus its fields
export const OVERRIDE_BODY_MAX = 256 * 1024; // admin override patch, only after the admin check (validateOverride caps it separately)
export const DATA_BODY_MAX = 4 * 1024 * 1024; // admin generic-route writes (/v1/data) — CSV/batch knowledge imports
export const AI_STREAM_BODY_MAX = 256 * 1024; // /v1/ai/stream — AI_LIMITS.chars is 60000 UTF-16 chars; Vietnamese is up to 3 UTF-8 bytes each, plus JSON escaping
export const AI_IMAGE_BODY_MAX = 64 * 1024; // /v1/ai/image — a prompt + negative prompt, never an upload
export const MCP_BODY_MAX = 256 * 1024; // /mcp — a JSON-RPC batch of several tool calls
export const HUBS_BODY_MAX = 64 * 1024; // /v1/hubs/* — small option bodies (rotate, owner, url, field mapping)

/** Streamed read capped at `max` bytes — checked against Content-Length first, then enforced while consuming the
 *  body (a client can omit or lie about that header). Shared by every capped-body reader below. */
async function readBytes(request: Request, max: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > max) throw new HttpError(413, 'Body too large');
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await reader.cancel().catch(() => {}); throw new HttpError(413, 'Body too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  chunks.reduce((offset, c) => { bytes.set(c, offset); return offset + c.byteLength; }, 0);
  return bytes;
}

/** Raw decoded text, capped at `max` bytes (default BODY_MAX) — for a non-JSON body (MCP relay's forwarded
 *  JSON-RPC text) or a caller that parses the JSON itself. Never buffers past the cap. */
export async function readText(request: Request, max = BODY_MAX): Promise<string> {
  return new TextDecoder().decode(await readBytes(request, max));
}

/** Parsed JSON body of ANY shape (object, array, primitive), capped at `max` bytes — for JSON-RPC (/mcp), which
 *  accepts a batch array that readBody's object-only contract below would otherwise flatten to {}. */
export async function readBodyUnknown(request: Request, max = BODY_MAX): Promise<unknown> {
  const text = await readText(request, max);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

/** JSON object body, capped at `max` bytes (default BODY_MAX). A non-object value (array, string, number...)
 *  becomes {} — every route here except /mcp expects a flat object body (see readBodyUnknown for that one). */
export async function readBody(request: Request, max = BODY_MAX): Promise<Rec> {
  const b = await readBodyUnknown(request, max);
  return b && typeof b === 'object' && !Array.isArray(b) ? (b as Rec) : {};
}
