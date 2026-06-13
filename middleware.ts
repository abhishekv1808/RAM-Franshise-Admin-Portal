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

  // 2. Authenticated -> resolve role from profiles.
  //    (profiles.role is added in the Step 2 migration; until then this is null.)
  let role: string | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = (data?.role as string | undefined) ?? null;
  } catch {
    role = null;
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
