"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RiUserLine, RiLockLine, RiLoader4Line } from "@remixicon/react";
import PixelBlast from "@/components/effects/PixelBlast";
import { Press_Start_2P } from "next/font/google";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"] });

function ShuffleText({ text, duration = 1200, fps = 30 }: { text: string; duration?: number; fps?: number }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let frame = 0;
    const total = Math.max(1, Math.round((duration / 1000) * fps));
    const interval = setInterval(() => {
      frame++;
      const progress = frame / total;
      const out = text
        .split("")
        .map((ch, i) => {
          // Preserve all whitespace (spaces, newlines) and punctuation so layout
          // and breaks exactly match the final version during the animation.
          if (/\s/.test(ch)) return ch;
          if (/[^A-Za-z0-9]/.test(ch)) return ch;
          const revealAt = i / Math.max(1, text.length);
          if (progress < revealAt) {
            return chars[(Math.random() * chars.length) | 0];
          }
          return ch;
        })
        .join("");
      setDisplay(out);
      if (frame >= total) {
        setDisplay(text);
        clearInterval(interval);
      }
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [text, duration, fps]);
  return (
    <span className="relative inline-block">
      <span className="invisible whitespace-pre-line">{text}</span>
      <span className="absolute inset-0 whitespace-pre-line" aria-hidden>
        {display}
      </span>
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Login failed");
        setLoading(false);
        return;
      }
      router.replace(next);
    } catch (err) {
      setError("Network error");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-svh grid place-items-center p-4">
      <PixelBlast
        variant="circle"
        pixelSize={6}
        color="#FACC15"
        patternScale={3}
        patternDensity={1.2}
        pixelSizeJitter={0.5}
        enableRipples
        rippleSpeed={0.4}
        rippleThickness={0.12}
        rippleIntensityScale={1.5}
        liquid
        liquidStrength={0.12}
        liquidRadius={1.2}
        liquidWobbleSpeed={5}
        speed={0.6}
        edgeFade={0.25}
        transparent
      />
      <div className="relative z-10 w-full max-w-[19rem] sm:max-w-[22rem] rounded-2xl border-[3px] border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-transparent shadow-2xl shadow-black/10">
        <Card className="w-full border-0 shadow-none rounded-xl overflow-hidden bg-background/30 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className={`text-center whitespace-pre-line leading-relaxed ${pressStart.className}`}>
              <ShuffleText text={"Sign in to\nRnD Dashboard"} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">User</Label>
                <div className="relative">
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Retard"
                    autoComplete="username"
                    required
                    className="ps-14 border border-yellow-500/30 focus-visible:ring-2 focus-visible:ring-yellow-500/40 focus-visible:border-yellow-500/60"
                  />
                  <span className="pointer-events-none absolute inset-y-0 start-0 grid w-12 place-items-center text-yellow-600 bg-yellow-500/10 border border-yellow-500/30 border-r-0 rounded-s-md">
                    <RiUserLine size={18} aria-hidden="true" />
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="ps-14 border border-yellow-500/30 focus-visible:ring-2 focus-visible:ring-yellow-500/40 focus-visible:border-yellow-500/60"
                  />
                  <span className="pointer-events-none absolute inset-y-0 start-0 grid w-12 place-items-center text-yellow-600 bg-yellow-500/10 border border-yellow-500/30 border-r-0 rounded-s-md">
                    <RiLockLine size={18} aria-hidden="true" />
                  </span>
                </div>
              </div>
              {error && (
                <div className="text-red-600 text-sm" role="alert">
                  {error}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className={`px-6 ${loading ? "cursor-wait" : ""}`}
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <RiLoader4Line className="animate-spin" size={16} aria-hidden="true" />
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
