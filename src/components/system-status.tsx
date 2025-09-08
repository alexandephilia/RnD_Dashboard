"use client";

import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type Props = {
    tokenCalls: unknown[];
    users: unknown[];
};

function toMillis(v: unknown): number | null {
    if (!v) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
        const t = Date.parse(v);
        return Number.isFinite(t) ? t : null;
    }
    if (v instanceof Date) {
        const t = +v;
        return Number.isFinite(t) ? t : null;
    }
    return null;
}

function parseTimestamp(item: unknown): number | null {
    // Prefer most recent fields first; fall back to others
    const obj = item as Record<string, unknown>;
    const v =
        obj?.last_updated ??
        obj?.updatedAt ??
        obj?.createdAt ??
        (obj?.first_poster as Record<string, unknown>)?.posted_at;
    return toMillis(v);
}

function relative(ms: number): string {
    const sec = Math.max(0, Math.round(ms / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.round(hr / 24);
    return `${d}d ago`;
}

export function SystemStatus({ tokenCalls, users }: Props) {
    const [open, setOpen] = useState(false);
    const [override, setOverride] = useState<{
        lastTs?: number | null;
        calls1h?: number;
        groups?: number;
        tokens?: number;
        usersCount?: number;
    } | null>(null);

    const details = useMemo(() => {
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;

        const calls = Array.isArray(tokenCalls) ? (tokenCalls as unknown[]) : [];
        const tsList = calls.map(parseTimestamp).filter((t): t is number => t != null);
        const lastTs = override?.lastTs ?? (tsList.length ? Math.max(...tsList) : null);
        const lastDelta = lastTs ? now - lastTs : Infinity;

        let status: "operational" | "degraded" | "down";
        if (lastTs == null) status = "down";
        else if (lastDelta <= 5 * 60 * 1000) status = "operational";
        else if (lastDelta <= 30 * 60 * 1000) status = "degraded";
        else status = "down";

        const calls1h = override?.calls1h ?? calls.filter((c) => {
            const t = parseTimestamp(c);
            return t != null && t >= oneHourAgo;
        }).length;

        const groups = override?.groups ?? new Set(calls.map((c) => (c as Record<string, unknown>)?.group_id).filter(Boolean)).size;
        const tokens = override?.tokens ?? new Set(calls.map((c) => (c as Record<string, unknown>)?.token_address).filter(Boolean)).size;
        const usersCount = override?.usersCount ?? (Array.isArray(users) ? users.length : 0);

        return { status, lastTs, lastDelta, calls1h, groups, tokens, usersCount };
    }, [tokenCalls, users, override]);

    const color =
        details.status === "operational"
            ? "green"
            : details.status === "degraded"
                ? "amber"
                : "red";

    // Close on Escape
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Poll live proxies directly to reflect health without relying on /stats
    useEffect(() => {
        let active = true;
        const tick = async () => {
            try {
                const [callsRes, usersRes, statsRes] = await Promise.all([
                    fetch("/api/rnd/token-calls?limit=100", { cache: "no-store" }),
                    fetch("/api/rnd/users?limit=100", { cache: "no-store" }),
                    fetch("/api/rnd/stats", { cache: "no-store" }),
                ]);
                if (!active) return;
                if (callsRes.ok) {
                    const calls = await callsRes.json();
                    if (Array.isArray(calls)) {
                        const now = Date.now();
                        const oneHourAgo = now - 60 * 60 * 1000;
                        const tsList = calls
                            .map((c) => {
                                const obj = c as Record<string, unknown>;
                                return obj?.last_updated || obj?.updatedAt || obj?.createdAt || (obj?.first_poster as Record<string, unknown>)?.posted_at;
                            })
                            .filter(Boolean)
                            .map((s: unknown) => Date.parse(s as string))
                            .filter((t: number) => Number.isFinite(t));
                        const lastTs = tsList.length ? Math.max(...tsList) : undefined;
                        const calls1h = calls.filter((c) => {
                            const obj = c as Record<string, unknown>;
                            const s = obj?.last_updated || obj?.updatedAt || obj?.createdAt || (obj?.first_poster as Record<string, unknown>)?.posted_at;
                            const t = s ? Date.parse(s as string) : NaN;
                            return Number.isFinite(t) && t >= oneHourAgo;
                        }).length;
                        const groups = new Set(calls.map((c) => (c as Record<string, unknown>)?.group_id).filter(Boolean)).size;
                        const tokens = new Set(calls.map((c) => (c as Record<string, unknown>)?.token_address).filter(Boolean)).size;
                        let usersCount: number | undefined = undefined;
                        if (usersRes.ok) {
                            const users = await usersRes.json();
                            if (Array.isArray(users)) usersCount = users.length;
                        }
                        let overrideFromStats: Partial<NonNullable<typeof override>> | null = null;
                        if (statsRes.ok) {
                            try {
                                const s = await statsRes.json();
                                overrideFromStats = {
                                    lastTs: toMillis(s?.last_event_ts) ?? lastTs,
                                    calls1h: typeof s?.calls_1h === "number" ? s.calls_1h : calls1h,
                                    groups: typeof s?.group_count === "number" ? s.group_count : groups,
                                    tokens: typeof s?.token_count === "number" ? s.token_count : tokens,
                                    usersCount: typeof s?.users_count === "number" ? s.users_count : usersCount,
                                };
                            } catch { }
                        }
                        setOverride(overrideFromStats ?? { lastTs, calls1h, groups, tokens, usersCount });
                    }
                }
            } catch {
                // ignore
            }
        };
        tick();
        const id = setInterval(tick, 30000);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                type="button"
                aria-label="System status"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-2 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/70 hover:bg-background"
            >
                <span className="relative inline-flex h-2.5 w-2.5">
                    <span
                        className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            color === "green" && "bg-green-500",
                            color === "amber" && "bg-amber-500",
                            color === "red" && "bg-red-500",
                        )}
                    />
                    <span
                        className={cn(
                            "relative inline-flex h-2.5 w-2.5 rounded-full",
                            color === "green" && "bg-green-500",
                            color === "amber" && "bg-amber-500",
                            color === "red" && "bg-red-500",
                        )}
                    />
                </span>
                <span
                    className={cn(
                        "text-xs font-medium",
                        color === "green" && "text-green-700",
                        color === "amber" && "text-amber-700",
                        color === "red" && "text-red-600",
                    )}
                >
                    {details.status === "operational"
                        ? "System Operational"
                        : details.status === "degraded"
                            ? "System Degraded"
                            : "System Down"}
                </span>
            </button>

            {/* Details panel */}
            <div
                className={cn(
                    "absolute bottom-12 right-0 w-80 origin-bottom-right rounded-lg border bg-background shadow-lg transition-all",
                    open ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95",
                )}
            >
                <div className="p-3 border-b flex items-center justify-between">
                    <div className="text-sm font-medium">System Status</div>
                    <span
                        className={cn(
                            "inline-flex h-2.5 w-2.5 rounded-full",
                            color === "green" && "bg-green-500",
                            color === "amber" && "bg-amber-500",
                            color === "red" && "bg-red-500",
                        )}
                    />
                </div>
                <div className="p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last event</span>
                        <span className="font-medium">
                            {details.lastTs ? relative(Date.now() - details.lastTs) : "n/a"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Token calls (1h)</span>
                        <span className="font-medium">{details.calls1h}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Groups</span>
                        <span className="font-medium">{details.groups}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tokens</span>
                        <span className="font-medium">{details.tokens}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Users</span>
                        <span className="font-medium">{details.usersCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
