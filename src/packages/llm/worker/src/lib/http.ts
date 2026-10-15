/** An error whose status + message are safe to show the caller (bad input, conflict, not found…). */
export class HttpError extends Error {
    status: number
    constructor(status: number, message: string) {
        super(message)
        this.status = status
        this.name = 'HttpError'
    }
}

/** '*' for public routes; otherwise the request's Origin only when it is on the comma-separated allowlist, else the first allowed. */
export function pickOrigin(requestOrigin: string | null, allowed: string, isPublic: boolean): string {
    if (isPublic) return '*'
    const list = (allowed || '').split(',').map(s => s.trim()).filter(Boolean)
    if (requestOrigin && list.includes(requestOrigin)) return requestOrigin
    return list[0] ?? ''
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127(?:\.\d+){3}|\[::1\])(?::\d+)?$/

/** A request made by this platform's own pages (an ALLOWED_ORIGIN entry, or local dev) — never a copied tag elsewhere. */
export function isFirstParty(requestOrigin: string | null, allowed: string): boolean {
    if (!requestOrigin) return false
    return LOCAL_ORIGIN.test(requestOrigin) || (allowed || '').split(',').map(s => s.trim()).includes(requestOrigin)
}

export function corsHeaders(origin: string): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        // Mcp-* — browser-based MCP clients (e.g. the MCP Inspector) send them to /mcp; X-Fn-Trial — /v1/fn/* trial mode (fn/trial.ts)
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,Mcp-Protocol-Version,Mcp-Session-Id,X-Fn-Trial',
        Vary: 'Origin',
    }
}

export function withCors(res: Response, origin: string): Response {
    const headers = new Headers(res.headers)
    for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value)
    return new Response(res.body, { status: res.status, headers })
}

export function json(data: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
    })
}

export function handleWorkerError(err: unknown): Response {
    if (err instanceof HttpError) return json({ message: err.message }, { status: err.status })
    console.error('[worker] unhandled:', err)
    return json({ message: 'Internal error' }, { status: 500 })
}
