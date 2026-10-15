/**
 * Worker entrypoint — router + CORS:
 *   GET/PATCH /v1/data/profiles[/:id]                     — Supabase `profiles` (profiles.ts)
 *   *         /v1/data/:table[/:id | /_batch | /:id/_bump] — bảng nội dung trên D1 ALL_DB (data.ts)
 *   *         /v1/billing/:action[/:id]                   — PayPal subscriptions (billing.ts)
 *
 * corsHeaders()/json() nhận 1 `origin` / `(data, init?)`; AuthError -> 401/403 map ở catch vì
 * lib/http.ts's handleWorkerError không tự xử lý.
 */
import { handleProfilesRoute, type ProfilesEnv } from './profiles';
import { handleDataRoute, type DataEnv } from './data';
import { handleBillingRoute, type BillingEnv } from './billing';
import { AuthError } from './lib/auth';
import { corsHeaders, withCors, json, handleWorkerError } from './lib/http';

export interface Env extends ProfilesEnv, DataEnv, BillingEnv {
  ALLOWED_ORIGIN: string;
}

const PROFILES_PATH = /^\/v1\/data\/profiles(?:\/([a-zA-Z0-9_-]+))?$/;
const DATA_PATH     = /^\/v1\/data\/([a-zA-Z0-9_]+)(?:\/([a-zA-Z0-9_-]+))?(?:\/(_bump))?$/;
const BILLING_PATH  = /^\/v1\/billing\/([a-z]+)(?:\/([a-zA-Z0-9_-]+))?$/; // id = Supabase user uuid (có '-')

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? env.ALLOWED_ORIGIN;
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const profiles = url.pathname.match(PROFILES_PATH);
      if (profiles) return withCors(await handleProfilesRoute(request, env, profiles[1]), origin);

      const billing = url.pathname.match(BILLING_PATH);
      if (billing) return withCors(await handleBillingRoute(request, env, billing[1], billing[2]), origin);

      const data = url.pathname.match(DATA_PATH);
      if (data) return withCors(await handleDataRoute(request, env, data[1], data[2], data[3]), origin);

      return withCors(json({ message: 'Not found' }, { status: 404 }), origin);
    } catch (err) {
      if (err instanceof AuthError) {
        return withCors(json({ message: err.message || 'Unauthorized' }, { status: err.message === 'Forbidden' ? 403 : 401 }), origin);
      }
      return withCors(handleWorkerError(err), origin);
    }
  },
};
