import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const protectedRoutes = ["/dashboard", "/tournaments"];
const authRoutes = ["/sign-in", "/sign-up"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  console.log(`[MIDDLEWARE] path=${pathname} loggedIn=${isLoggedIn} fullUrl=${req.nextUrl.toString()}${pathname === '/dashboard' ? ' referer=' + (req.headers.get('referer') || 'none') : ''}`);

  const isPublicPage = pathname.endsWith("/public");
  const isProtected = !isPublicPage && protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If navigating to /dashboard from an auth page that had a redirect param,
  // honor that redirect instead of landing on dashboard.
  // This handles the race where NextAuth's internal session refresh triggers
  // a /dashboard navigation alongside our intended redirect.
  if (pathname === "/dashboard" && isLoggedIn) {
    const referer = req.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const authReferer = authRoutes.some(
          (route) => refererUrl.pathname === route || refererUrl.pathname.startsWith(route + "/")
        );
        if (authReferer) {
          const intendedRedirect = refererUrl.searchParams.get("redirect");
          if (intendedRedirect && intendedRedirect.startsWith("/") && !intendedRedirect.startsWith("//")) {
            console.log(`[MIDDLEWARE] Intercepting /dashboard from auth referer, redirecting to: ${intendedRedirect}`);
            return NextResponse.redirect(new URL(intendedRedirect, req.nextUrl.origin));
          }
        }
      } catch {}
    }
  }

  if (isAuthRoute && isLoggedIn) {
    const redirectParam = req.nextUrl.searchParams.get("redirect");
    const destination =
      redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/dashboard";
    console.log(`[MIDDLEWARE] Auth route + logged in. redirectParam=${redirectParam} destination=${destination}`);
    return NextResponse.redirect(new URL(destination, req.nextUrl.origin));
  }

  // Redirect authenticated users from home page to dashboard (avoids flash in PWA)
  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}