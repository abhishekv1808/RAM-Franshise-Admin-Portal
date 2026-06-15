import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Auth email-link landing route. Establishes a session from a Supabase email
 * link, then forwards to `next` (the password-setup page for invited admins).
 *
 * Handles BOTH delivery styles so it works no matter which email template /
 * auth flow the project uses:
 *
 *  - token_hash + type  → verifyOtp().  This is the cross-browser-safe path:
 *    the recipient does NOT need the PKCE code-verifier cookie, so it works
 *    when the invitee opens the link in a different browser/device than the
 *    super_admin who created them. (Requires the recovery/invite email template
 *    to use `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/set-password`.)
 *
 *  - code               → exchangeCodeForSession().  The default PKCE flow;
 *    only works in the same browser that initiated the email (verifier cookie
 *    present). Kept as a fallback.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Only allow same-site relative redirects (no open-redirect via ?next=).
  const rawNext = searchParams.get("next") ?? "/set-password";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/set-password";

  const supabase = await createClient();

  let ok = false;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.search = "";
  if (ok) {
    redirectUrl.pathname = next;
  } else {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "invite-invalid");
  }
  return NextResponse.redirect(redirectUrl);
}
