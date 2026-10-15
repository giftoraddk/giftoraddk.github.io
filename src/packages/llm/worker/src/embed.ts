/**
 * Workers AI embedding wrapper for the `know` RAG pipeline (see search.ts/vectorize.ts,
 * hook/knowledge_database_cloudflare_d1_vectorize.md). One place to name the model so it's never
 * hard-coded at more than one call site.
 *
 * bge-m3 (1024-dim, multilingual) chosen over the hook doc's example bge-base-en-v1.5
 * (English-only) — this app's `know` content is primarily Vietnamese.
 */
export const EMBEDDING_MODEL = '@cf/baai/bge-m3';

export interface EmbedEnv {
  AI: Ai;
}

export async function embedText(env: EmbedEnv, text: string): Promise<number[]> {
  const result: any = await env.AI.run(EMBEDDING_MODEL, { text: [text] });
  return result.data[0];
}

/** Several texts in one model call — same order out as in (chunk batches, see vectorize.ts's syncKnowIndex). */
export async function embedTexts(env: EmbedEnv, texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const result: any = await env.AI.run(EMBEDDING_MODEL, { text: texts });
  return result.data;
}
