/**
 * supabase.js — Supabase client init, browser-side.
 *
 * PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY are genuinely safe to ship in the bundle —
 * unlike the LLM keys and PUBLIC_SALT this migration removes, Supabase's publishable key is
 * designed to be public (real access control is Postgres RLS + the Worker's service-role gate for
 * privileged fields, see worker/packages/db-worker/src/db.ts).
 */
import { createClient } from '@supabase/supabase-js';

// flowType: 'pkce' — OAuth redirect trả về qua query "?code=" thay vì hash "#access_token=..."
// (mặc định 'implicit'), tránh hẳn lỗi hash chồng "##" khi redirectTo lỡ mang theo hash cũ.
export const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { flowType: 'pkce' } },
);
