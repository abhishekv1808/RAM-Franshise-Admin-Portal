import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Paths reachable without an authenticated session. */
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

/** Where a given role should land after login. null = no access. */
function roleHome(role: string | null): string | null {
  if (role === "super_admin") return "/dashboard";
  if (role === "franchise_admin") return "/franchise";
  return null;
}

export async function middleware(request: NextRequest) {
  const { user, supabase, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // 1. Not authenticated -> only public paths allowed.
  if (!user) {
    if (isPublic(pathname)) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated -> resolve role from profiles, plus (for franchise admins)
  //    their franchise's status so suspension can be enforced HERE, not just in
  //    the DB. Suspension never deletes data — it gates access at this layer.
  let role: string | null = null;
  let franchiseStatus: string | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("role, franchise_id")
      .eq("id", user.id)
      .single();
    role = (data?.role as string | undefined) ?? null;
    const franchiseId = data?.franchise_id as string | undefined;
    if (role === "franchise_admin" && franchiseId) {
      const { data: fr } = await supabase
        .from("franchises")
        .select("status")
        .eq("id", franchiseId)
        .single();
      franchiseStatus = (fr?.status as string | undefined) ?? null;
    }
  } catch {
    role = null;
  }

  // 2a. SUSPENSION GATE — a franchise_admin whose franchise is suspended is
  //     blocked from everything except the login page (where they see why).
  //     Reactivation flips status back to 'active' and access resumes next request.
  if (role === "franchise_admin" && franchiseStatus === "suspended") {
    if (pathname === "/login") return supabaseResponse; // show message, no redirect loop
    const url = request.nextUrl.clone();
    url.search = "";
    url.pathname = "/login";
    url.searchParams.set("error", "suspended");
    return NextResponse.redirect(url);
  }

  const home = roleHome(role);

  // 3. Authenticated but no valid admin role -> bounce to login with an error.
  if (!home) {
    if (pathname === "/login") return supabaseResponse; // avoid redirect loop
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "no-access");
    return NextResponse.redirect(url);
  }

  // 4. Authenticated with a role visiting /login or / -> send to their home.
  if (pathname === "/login" || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  // 5. Cross-role section guard.
  //    - franchise_admin may not enter /dashboard (super-admin area).
  //    - super_admin is allowed everywhere.
  if (role === "franchise_admin" && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/franchise";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
