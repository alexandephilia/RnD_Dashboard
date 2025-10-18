"use client";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiLoader4Line, RiLockLine, RiUserLine } from "@remixicon/react";
import { Press_Start_2P } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

function LoginForm() {
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
        } catch {
            setError("Network error");
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-svh grid place-items-center p-4 overflow-hidden">
            <div className="relative z-10 w-full max-w-[19rem] sm:max-w-[22rem] rounded-2xl border-[2px] border-dashed border-yellow-500/25 bg-card/30 shadow-xl shadow-yellow-500/10 backdrop-blur-lg">
                <Card className="w-full border-none shadow-none rounded-xl overflow-hidden bg-background/55 backdrop-blur-xl">
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
                                    <div className="rounded-t-4xl group relative flex items-center overflow-hidden rounded-lg border border-dashed border-yellow-500/35 backdrop-blur-sm transition-all duration-300 focus-within:border-yellow-400 focus-within:shadow-[0_0_25px_rgba(250,204,21,0.2)]">
                                    <BorderBeam
                                            size={20}
                                            duration={8}
                                             colorFrom="rgba(253, 224, 71, 0.65)"
                                             colorTo="rgba(253, 223, 71, 0.36)"
                                             initialOffset={0}
                                            borderWidth={1}
                                            inset={0}
                                            className="opacity-75 blur-[2px]"
                                        />
                                        <BorderBeam
                                            size={20}
                                            duration={8}
                                             colorFrom="rgba(253, 224, 71, 0.65)"
                                             colorTo="rgba(253, 223, 71, 0.36)"
                                             initialOffset={50}
                                            borderWidth={1}
                                            inset={0}
                                            className="opacity-75 blur-[2px]"
                                        />
                                        <span className="pointer-events-none relative z-10 grid h-full w-12 place-items-center border-e border-dashed border-yellow-600/35 bg-transparent text-yellow-300 transition-colors duration-300 group-focus-within:text-yellow-200">
                                            <RiUserLine size={18} aria-hidden="true" />
                                        </span>
                                        <Input
                                            id="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Retard"
                                            autoComplete="username"
                                            required
                                            className="relative z-10 h-11 flex-1 border-none bg-transparent px-3 text-foreground focus-visible:border-none focus-visible:outline-none focus-visible:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <div className="rounded-lg rounded-b-4xl group relative flex items-center overflow-hidden rounded-lg border border-dashed border-yellow-600/35 backdrop-blur-sm transition-all duration-300 focus-within:border-yellow-400 focus-within:shadow-[0_0_25px_rgba(250,204,21,0.2)]">
                                        <BorderBeam
                                            size={20}
                                            duration={8}
                                            colorFrom="rgba(253, 224, 71, 0.65)"
                                            colorTo="rgba(253, 223, 71, 0.36)"
                                            initialOffset={50}
                                            borderWidth={1}
                                            inset={0}
                                            className="opacity-90 blur-[1.2px]"
                                        />
                                   <BorderBeam
                                            size={20}
                                            duration={8}
                                             colorFrom="rgba(253, 224, 71, 0.65)"
                                             colorTo="rgba(253, 223, 71, 0.36)"
                                             initialOffset={0}
                                            borderWidth={1}
                                            inset={0}
                                            className="opacity-75 blur-[2px]"
                                        />
                                        <span className="pointer-events-none relative z-10 grid h-full w-12 place-items-center border-e border-dashed border-yellow-500/35 bg-transparent text-yellow-300 transition-colors duration-300 group-focus-within:text-yellow-200">
                                            <RiLockLine size={18} aria-hidden="true" />
                                        </span>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                            required
                                            className="relative z-10 h-11 flex-1 border-none bg-transparent px-3 text-foreground focus-visible:border-none focus-visible:outline-none focus-visible:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>
                            {error && (
                                <div className="text-red-600 text-sm" role="alert">
                                    {error}
                                </div>
                            )}
                            <div className="flex justify-end">
                                <Button
                                    variant="ghost"
                                    type="submit"
                                    className={`rounded-tl-4xl px-6 border border-dashed border-yellow-500/60 bg-transparent text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300 focus-visible:ring-yellow-400 focus-visible:ring-2 focus-visible:ring-offset-0 ${loading ? "cursor-wait" : ""}`}
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

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-svh grid place-items-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
