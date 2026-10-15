import { createClient } from '@supabase/supabase-js'

// Single shared client — every auth/profile call in this app goes through this instance so
// supabase-js's own session persistence (localStorage) stays consistent across components.
// flowType 'pkce' is required for the Google OAuth redirect flow in packages/auth/svc-auth.js.
export const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { flowType: 'pkce' } },
)
