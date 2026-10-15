// Ported verbatim from ../../../llm/worker/src/lib/http.ts — kept identical across both Workers'
// entrypoints (no shared workspace package in this repo, each Worker keeps its own copy).
export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
}

export function withCors(res: Response, origin: string): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value);
  return new Response(res.body, { status: res.status, headers });
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  });
}

export function handleWorkerError(err: unknown): Response {
  const message = err instanceof Error ? err.message : 'Internal error';
  return json({ message }, { status: 500 });
}
