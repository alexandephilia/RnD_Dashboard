import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const expectedEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_USER || "Retard";
    const expectedPass = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "rnd420";

    const ok = String(email || "").trim() === expectedEmail && String(password || "").trim() === expectedPass;
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    // Simple session cookie; clearing browser data will sign the user out.
    res.cookies.set("session", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    // Store admin name for UI greeting
    res.cookies.set("admin_name", String(email || "Admin"), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
