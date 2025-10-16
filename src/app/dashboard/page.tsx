import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "RnD Dashboard | Admin",
};

import { AppSidebar } from "@/components/app-sidebar";
import { DbLists } from "@/components/db-lists";
import { SystemStatus } from "@/components/system-status";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import UserDropdown from "@/components/user-dropdown";
import { RiScanLine } from "@remixicon/react";
import { Press_Start_2P } from "next/font/google";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"] });

import { StatsLive } from "@/components/stats-live";
import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";
import { RiBarChartLine, RiDatabaseLine, RiGroupLine, RiUserLine } from "@remixicon/react";
import { cookies } from "next/headers";
import fs from "node:fs/promises";
import path from "node:path";

async function getTokenCalls() {
    // 1) Query Mongo directly if configured
    try {
        if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL) {
            const client = await getMongoClient();
            const { dbName, tokenCalls } = getDbAndCollections();
            const col = client.db(dbName).collection(tokenCalls);
            const docs = await col
                .find({})
                .sort({ last_updated: -1, updatedAt: -1 })
                .limit(500)
                .toArray();
            if (Array.isArray(docs)) return docs as unknown[];
        }
    } catch { }
    // 2) Try live proxy
    try {
        const res = await fetch("/api/rnd/token-calls?limit=500", { cache: "no-store" });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) return data as unknown[];
        }
    } catch { }
    // 3) Optional local fallback (disabled in production or when explicitly off)
    const allowFallback =
        process.env.USE_LOCAL_FALLBACK !== "false" && process.env.NODE_ENV !== "production";
    if (allowFallback) {
        try {
            const file = await fs.readFile(
                path.join(process.cwd(), "public", "data", "token-calls.json"),
                "utf-8",
            );
            return JSON.parse(file) as unknown[];
        } catch { }
    }
    return [] as unknown[];
}

async function getBotUsers() {
    // 1) Query Mongo directly if configured
    try {
        if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL) {
            const client = await getMongoClient();
            const { dbName, users } = getDbAndCollections();
            const col = client.db(dbName).collection(users);
            const docs = await col
                .find({})
                .sort({ updatedAt: -1 })
                .limit(500)
                .toArray();
            if (Array.isArray(docs)) return docs as unknown[];
        }
    } catch { }
    // 2) Try live proxy
    try {
        const res = await fetch("/api/rnd/users?limit=500", { cache: "no-store" });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) return data as unknown[];
        }
    } catch { }
    // 3) Optional local fallback
    const allowFallback =
        process.env.USE_LOCAL_FALLBACK !== "false" && process.env.NODE_ENV !== "production";
    if (allowFallback) {
        try {
            const file = await fs.readFile(
                path.join(process.cwd(), "public", "data", "users-bot.json"),
                "utf-8",
            );
            return JSON.parse(file) as unknown[];
        } catch { }
    }
    return [] as unknown[];
}

async function getGroupMonthlyTokens() {
    // 1) Query Mongo directly if configured
    try {
        if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL || process.env.MONGODB_URI) {
            const client = await getMongoClient();
            const { dbName, groupMonthlyTokens } = getDbAndCollections();
            const col = client.db(dbName).collection(groupMonthlyTokens);
            const docs = await col
                .find({})
                .sort({ updatedAt: -1, last_updated: -1, createdAt: -1 })
                .limit(500)
                .toArray();
            if (Array.isArray(docs)) return docs as unknown[];
        }
    } catch { }
    // 2) Try local API proxy
    try {
        const res = await fetch("/api/rnd/group-monthly-tokens?limit=500", { cache: "no-store" });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) return data as unknown[];
        }
    } catch { }
    // 3) Optional local fallback
    const allowFallback =
        process.env.USE_LOCAL_FALLBACK !== "false" && process.env.NODE_ENV !== "production";
    if (allowFallback) {
        try {
            const file = await fs.readFile(
                path.join(process.cwd(), "public", "data", "group-monthly-tokens.json"),
                "utf-8",
            );
            return JSON.parse(file) as unknown[];
        } catch { }
    }
    return [] as unknown[];
}

export default async function Page() {
    const cookieStore = await cookies();
    const adminNameRaw = (cookieStore.get("admin_name")?.value || "Admin").trim();
    const adminName = adminNameRaw
        ? adminNameRaw.charAt(0).toUpperCase() + adminNameRaw.slice(1)
        : "Admin";
    const [tokenCalls, users, groupMonthly] = await Promise.all([
        getTokenCalls(),
        getBotUsers(),
        getGroupMonthlyTokens(),
    ]);

    // Ensure client components receive plain JSON-serializable data
    const tokenCallsPlain: unknown[] = JSON.parse(JSON.stringify(tokenCalls));
    const usersPlain: unknown[] = JSON.parse(JSON.stringify(users));
    const groupMonthlyPlain: unknown[] = JSON.parse(JSON.stringify(groupMonthly));

    // Derive dashboard stats for RnD_Bot monitoring
    const uniq = <T,>(arr: T[], key: (item: T) => unknown) =>
        new Set(arr.map(key).filter(Boolean)).size;

    const now = Date.now();
    const windowMs = Number(process.env.DASHBOARD_WINDOW_MS ?? 24 * 60 * 60 * 1000); // default 24h
    const currStart = now - windowMs;
    const prevStart = now - 2 * windowMs;

    const getTs = (t: unknown) => {
        const obj = t as Record<string, unknown>;
        return (
            (obj?.last_updated as string) ||
            (obj?.updatedAt as string) ||
            (obj?.createdAt as string) ||
            ((obj?.first_poster as Record<string, unknown>)?.posted_at as string) ||
            ""
        );
    };

    function windowCounts<T>(
        arr: T[],
        ts: (x: T) => string,
        key?: (x: T) => unknown,
    ) {
        const inCurr = (x: T) => {
            const s = ts(x);
            const n = s ? Date.parse(s) : NaN;
            return Number.isFinite(n) && n >= currStart;
        };
        const inPrev = (x: T) => {
            const s = ts(x);
            const n = s ? Date.parse(s) : NaN;
            return Number.isFinite(n) && n >= prevStart && n < currStart;
        };
        if (key) {
            const curr = new Set(arr.filter(inCurr).map(key).filter(Boolean)).size;
            const prev = new Set(arr.filter(inPrev).map(key).filter(Boolean)).size;
            return { curr, prev };
        }
        const curr = arr.filter(inCurr).length;
        const prev = arr.filter(inPrev).length;
        return { curr, prev };
    }



    const groupsWin = windowCounts(tokenCallsPlain, getTs, (t: unknown) => (t as Record<string, unknown>).group_id);
    const tokensWin = windowCounts(tokenCallsPlain, getTs, (t: unknown) => (t as Record<string, unknown>).token_address);
    const callsWin = windowCounts(tokenCallsPlain, getTs);
    const callsLabel = "Token Calls";
    const periodLabel = "in 24h";
    const usersWin = windowCounts(usersPlain, (u: unknown) => {
        const obj = u as Record<string, unknown>;
        return (obj?.createdAt as string) || (obj?.updatedAt as string);
    });

    // Snapshot-wide counts from API (authoritative, not limited to 100 docs)
    type StatsSnapshot = {
        group_count?: number;
        token_count?: number;
        users_count?: number;
        calls_1h?: number;
        calls_24h?: number;
        calls_total?: number;
        groups_24h?: number;
        tokens_24h?: number;
        users_24h?: number;
    };
    let statsSnapshot: StatsSnapshot | null = null;
    try {
        const res = await fetch("/api/rnd/stats", { cache: "no-store" });
        if (res.ok) {
            statsSnapshot = (await res.json()) as StatsSnapshot;
        }
    } catch { }

    const callsValue = statsSnapshot?.calls_total ?? tokenCallsPlain.length;

    // Compute 24h growth percentages relative to totals (never negative)
    const pctUp = (gain: number, total: number) => {
        if (!Number.isFinite(total) || total <= 0) return "0%";
        const g = Math.max(0, gain || 0);
        const pct = Math.round((g / total) * 100);
        return `${pct}%`;
    };

    const totals = {
        groups: statsSnapshot?.group_count ?? uniq(tokenCallsPlain, (t: unknown) => (t as Record<string, unknown>).group_id),
        users: statsSnapshot?.users_count ?? usersPlain.length,
        tokens: statsSnapshot?.token_count ?? uniq(tokenCallsPlain, (t: unknown) => (t as Record<string, unknown>).token_address),
        calls: statsSnapshot?.calls_total ?? tokenCallsPlain.length,
    } as const;

    const gains24h = {
        groups: statsSnapshot?.groups_24h ?? groupsWin.curr,
        users: statsSnapshot?.users_24h ?? usersWin.curr,
        tokens: statsSnapshot?.tokens_24h ?? tokensWin.curr,
        calls: statsSnapshot?.calls_24h ?? callsWin.curr,
    } as const;

    // Build production sparkline data from last window (default 24h)
    function buildCounts<T>(arr: T[], ts: (x: T) => string, start: number, end: number, bins = 24) {
        const out = Array(bins).fill(0) as number[];
        if (!arr.length) return out;
        const width = Math.max(1, end - start);
        for (const item of arr) {
            const s = ts(item);
            const n = s ? Date.parse(s) : NaN;
            if (!Number.isFinite(n)) continue;
            if (n < start || n > end) continue;
            const idx = Math.min(bins - 1, Math.max(0, Math.floor(((n - start) / width) * bins)));
            out[idx] += 1;
        }
        return out;
    }

    function buildUniques<T>(arr: T[], ts: (x: T) => string, key: (x: T) => unknown, start: number, end: number, bins = 24) {
        const sets = Array.from({ length: bins }, () => new Set<string>());
        if (arr.length) {
            const width = Math.max(1, end - start);
            for (const item of arr) {
                const s = ts(item);
                const n = s ? Date.parse(s) : NaN;
                if (!Number.isFinite(n)) continue;
                if (n < start || n > end) continue;
                const idx = Math.min(bins - 1, Math.max(0, Math.floor(((n - start) / width) * bins)));
                const k = key(item);
                if (k != null) sets[idx].add(String(k));
            }
        }
        return sets.map(s => s.size);
    }

    const bins = 24;
    const prodSparklines = {
        groups: buildUniques(tokenCallsPlain, getTs, (t: unknown) => (t as Record<string, unknown>).group_id, currStart, now, bins),
        users: buildCounts(usersPlain, (u: unknown) => {
            const obj = u as Record<string, unknown>;
            return (obj?.createdAt as string) || (obj?.updatedAt as string) || "";
        }, currStart, now, bins),
        tokens: buildUniques(tokenCallsPlain, getTs, (t: unknown) => (t as Record<string, unknown>).token_address, currStart, now, bins),
        calls: buildCounts(tokenCallsPlain, getTs, currStart, now, bins),
    } as const;

    const stats = [
        {
            title: "Groups",
            value: totals.groups.toLocaleString(),
            change: { value: pctUp(gains24h.groups, totals.groups), trend: "up" as const },
            icon: <RiGroupLine size={20} aria-hidden="true" suppressHydrationWarning />,
            sparklineData: prodSparklines.groups,
        },
        {
            title: "Users",
            value: totals.users.toLocaleString(),
            change: { value: pctUp(gains24h.users, totals.users), trend: "up" as const },
            icon: <RiUserLine size={20} aria-hidden="true" suppressHydrationWarning />,
            sparklineData: prodSparklines.users,
        },
        {
            title: "Tokens",
            value: totals.tokens.toLocaleString(),
            change: { value: pctUp(gains24h.tokens, totals.tokens), trend: "up" as const },
            icon: <RiDatabaseLine size={20} aria-hidden="true" suppressHydrationWarning />,
            sparklineData: prodSparklines.tokens,
        },
        {
            title: callsLabel,
            value: callsValue.toLocaleString(),
            change: { value: pctUp(gains24h.calls, totals.calls), trend: "up" as const },
            icon: <RiBarChartLine size={20} aria-hidden="true" suppressHydrationWarning />,
            sparklineData: prodSparklines.calls,
        },
    ];
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="overflow-hidden px-4 md:px-6 lg:px-8">
                <header className="flex h-16 shrink-0 items-center gap-2 border-b">
                    <div className="flex flex-1 items-center gap-2 px-3">
                        <SidebarTrigger className="-ms-4" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="#">
                                        <RiScanLine size={22} aria-hidden="true" suppressHydrationWarning />
                                        <span className="sr-only">Dashboard</span>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className={pressStart.className}>Dashboard</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex gap-3 ml-auto">
                        <UserDropdown />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 lg:gap-6 py-4 lg:py-6">
                    {/* Page intro */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className={`text-2xl font-semibold ${pressStart.className}`}>Hey, {adminName}!</h1>
                        </div>
                    </div>
                    {/* Numbers (24h, live-updated from /api/rnd/stats) */}
                    <StatsLive initial={stats} periodLabel={periodLabel} />
                    <DbLists tokenCalls={tokenCallsPlain} users={usersPlain} groupMonthlyTokens={groupMonthlyPlain} />
                </div>
            </SidebarInset>
            <SystemStatus tokenCalls={tokenCallsPlain} users={usersPlain} />
        </SidebarProvider>
    );
}
