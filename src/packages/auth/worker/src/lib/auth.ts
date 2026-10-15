/**
 * Verifies a Supabase Auth access token via its JWKS endpoint (asymmetric signing keys) — no
 * shared secret needed, the JWKS public key only verifies the signature. Ported verbatim from
 * ../../../llm/worker/src/lib/auth.ts (no shared workspace package in this repo).
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

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

export async function verifySupabaseJWT(token: string, supabaseUrl: string): Promise<VerifiedUser> {
  const { payload } = await jwtVerify(token, jwks(supabaseUrl), { issuer: `${supabaseUrl}/auth/v1` });
  if (!payload.sub) throw new AuthError('JWT has no subject');
  return { userId: payload.sub, email: (payload.email as string) ?? null, claims: payload };
}

/** Reads `Authorization: Bearer <token>`, verifies it. Throws AuthError if missing/invalid. */
export async function requireAuth(request: Request, supabaseUrl: string): Promise<VerifiedUser> {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) throw new AuthError('Missing bearer token');
  return verifySupabaseJWT(header.slice(7), supabaseUrl);
}
