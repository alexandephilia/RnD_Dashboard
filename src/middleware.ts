import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/logout", "/favicon.ico"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public assets and login/logout
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/public") ||
    PUBLIC_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  // Allow payment routes (public demo)
  if (pathname.startsWith("/payment")) {
    return NextResponse.next();
  }

  // Protect root and dashboard
  const needsAuth = pathname === "/" || pathname.startsWith("/dashboard");
  if (!needsAuth) return NextResponse.next();

  const session = req.cookies.get("session")?.value;
  if (session === "1") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/(.*)"],
};

