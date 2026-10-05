import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { supabaseConfigured } from "@/lib/env";

/**
 * Route protection lives here (server-side, before any page renders).
 *
 *  - Refreshes the Supabase auth session cookie on every request.
 *  - Redirects signed-out visitors away from app routes.
 *  - Redirects signed-in but not-onboarded students to /onboarding.
 *
 * Demo mode (no Supabase keys) intentionally allows the app routes so the
 * product can be explored; production deployments always require a session.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tutor",
  "/tutorials",
  "/quiz",
  "/solve",
  "/exam-prep",
  "/flashcards",
  "/notes",
  "/mistakes",
  "/progress",
  "/profile",
  "/upgrade",
  "/onboarding",
  "/admin",
];

export async function middleware(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const configured = supabaseConfigured();

  if (isProtected && configured && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Signed-in students who haven't finished onboarding go straight there.
  if (isProtected && configured && userId && pathname !== "/onboarding") {
    const onboardingCookie = request.cookies.get("starvia_onboarded")?.value;
    if (onboardingCookie === "0") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimisation, while
     * still covering API routes so auth cookies stay fresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|woff2?)$).*)",
  ],
};
