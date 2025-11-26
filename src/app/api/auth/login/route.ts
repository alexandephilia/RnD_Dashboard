import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const timingSafeEqual = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const expectedEmail = (process.env.ADMIN_EMAIL || process.env.ADMIN_USER || "").trim();
    const expectedPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || "").trim();
    const expectedPasswordSha = (process.env.ADMIN_PASSWORD_SHA256 || "").trim().toLowerCase();

    if (!expectedEmail || (!expectedPassword && !expectedPasswordSha)) {
      return NextResponse.json({ error: "Login is not configured" }, { status: 500 });
    }

    const suppliedEmail = String(email ?? "").trim();
    const suppliedPassword = String(password ?? "").trim();

    const matchesPassword = (() => {
      if (expectedPasswordSha) {
        const suppliedDigest = crypto
          .createHash("sha256")
          .update(suppliedPassword, "utf8")
          .digest("hex")
          .toLowerCase();
        return timingSafeEqual(suppliedDigest, expectedPasswordSha);
      }
      return timingSafeEqual(suppliedPassword, expectedPassword);
    })();

    const ok = timingSafeEqual(suppliedEmail, expectedEmail) && matchesPassword;
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
