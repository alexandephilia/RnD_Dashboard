import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", _req.url));
  res.cookies.set("session", "", { path: "/", maxAge: 0 });
  return res;
}

