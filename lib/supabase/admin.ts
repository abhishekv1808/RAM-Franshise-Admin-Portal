import "server-only"; // Build error if this module is ever imported into client code.
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES RLS — server-side use ONLY.
 *
 * Two guarantees it never reaches the browser:
 *  1. `import "server-only"` makes any client-side import a build-time error.
 *  2. It reads SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix), so the value
 *     is not inlined into the client bundle.
 *
 * Only call this from Server Actions / Route Handlers.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
