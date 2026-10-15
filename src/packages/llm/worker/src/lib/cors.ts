// Routes called from customers' sites (embedded <svc-aide>, MCP clients) — CORS '*'; they authenticate by bearer, never cookies.
const PUBLIC_PATHS = [/^\/v1\/search$/, /^\/v1\/ai\/stream$/, /^\/v1\/fn\/(sectors|aide)$/, /^\/v1\/mcp\/[a-z0-9-]+$/, /^\/mcp$/];
// Read-only lookups of the guest widget; writes to the same tables stay on the allowlist.
const PUBLIC_DATA = /^\/v1\/data\/(know|rel|divisions)(\/|$)/;

/** A preflight is classified by the method it asks for — it only shapes the 204's headers; the real request is classified again. */
export function isPublicRoute(request: Request, pathname: string): boolean {
  const method = request.method === 'OPTIONS' ? (request.headers.get('Access-Control-Request-Method') ?? '') : request.method;
  return PUBLIC_PATHS.some(p => p.test(pathname)) || (method === 'GET' && PUBLIC_DATA.test(pathname));
}
