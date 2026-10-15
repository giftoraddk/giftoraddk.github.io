/**
 * Verifies a Supabase Auth access token via its JWKS endpoint (asymmetric signing keys) — used by
 * this Worker's routes that require a signed-in caller (`data.ts`, `ai.ts`'s image route). No
 * shared secret needed: the JWKS public key only verifies the signature, it can't be used to mint
 * a token.
 */
import { createRemoteJWKSet, jwtVerify, errors, type JWTPayload } from 'jose';

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function jwks(supabaseUrl: string) {
  _jwks ??= createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  return _jwks;
}

export interface VerifiedUser {
  userId: string;
  email: string | null;
  claims: Record<string, unknown>;
}

export class AuthError extends Error {}

// A bad/expired/malformed token, not a JWKS outage (timeout, unreachable, non-200/non-JSON, or malformed key set).
export const isInvalidToken = (err: unknown): boolean =>
  err instanceof errors.JOSEError &&
  !(err instanceof errors.JWKSTimeout) &&
  !(err instanceof errors.JWKSInvalid) &&
  err.code !== 'ERR_JOSE_GENERIC';

export async function verifySupabaseJWT(token: string, supabaseUrl: string): Promise<VerifiedUser> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwks(supabaseUrl), { issuer: `${supabaseUrl}/auth/v1` }));
  } catch (err) {
    // JWKS network failures/timeouts/outages aren't a bad token — rethrow so they surface as 500s, not sign-outs.
    if (isInvalidToken(err)) throw new AuthError('Invalid token');
    throw err;
  }
  if (!payload.sub) throw new AuthError('JWT has no subject');
  return { userId: payload.sub, email: (payload.email as string) ?? null, claims: payload };
}

/** Reads `Authorization: Bearer <token>`, verifies it. Throws AuthError if missing/invalid. */
export async function requireAuth(request: Request, supabaseUrl: string): Promise<VerifiedUser> {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) throw new AuthError('Missing bearer token');
  return verifySupabaseJWT(header.slice(7), supabaseUrl);
}
