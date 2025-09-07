import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RnD Dashboard | Admin",
};

import { AppSidebar } from "@/components/app-sidebar";
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
import { DbLists } from "@/components/db-lists";
import { SystemStatus } from "@/components/system-status";
import { RiScanLine } from "@remixicon/react";
import { StatsGrid } from "@/components/stats-grid";
import { StatsLive } from "@/components/stats-live";
import { RiGroupLine, RiUserLine, RiDatabaseLine, RiBarChartLine } from "@remixicon/react";
import fs from "node:fs/promises";
import path from "node:path";
import { getMongoClient, getDbAndCollections } from "@/server/db/mongo";
import { cookies } from "next/headers";

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
  } catch {}
  // 2) Try live proxy
  try {
    const res = await fetch("/api/rnd/token-calls?limit=500", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data as unknown[];
    }
  } catch {}
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
    } catch {}
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
  } catch {}
  // 2) Try live proxy
  try {
    const res = await fetch("/api/rnd/users?limit=500", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data as unknown[];
    }
  } catch {}
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
    } catch {}
  }
  return [] as unknown[];
}

export default async function Page() {
  const cookieStore = await cookies();
  const adminNameRaw = (cookieStore.get("admin_name")?.value || "Admin").trim();
  const adminName = adminNameRaw
    ? adminNameRaw.charAt(0).toUpperCase() + adminNameRaw.slice(1)
    : "Admin";
  const [tokenCalls, users] = await Promise.all([
    getTokenCalls(),
    getBotUsers(),
  ]);

  // Ensure client components receive plain JSON-serializable data
  const tokenCallsPlain: any[] = JSON.parse(JSON.stringify(tokenCalls));
  const usersPlain: any[] = JSON.parse(JSON.stringify(users));

  // Derive dashboard stats for RnD_Bot monitoring
  const uniq = <T, K extends keyof any>(arr: T[], key: (item: T) => K) =>
    new Set(arr.map(key).filter(Boolean)).size;

  const now = Date.now();
  const windowMs = Number(process.env.DASHBOARD_WINDOW_MS ?? 24 * 60 * 60 * 1000); // default 24h
  const currStart = now - windowMs;
  const prevStart = now - 2 * windowMs;

  const getTs = (t: any) =>
    (t?.last_updated as string) ||
    (t?.updatedAt as string) ||
    (t?.createdAt as string) ||
    (t?.first_poster?.posted_at as string) ||
    "";

  function windowCounts<T>(
    arr: T[],
    ts: (x: T) => string,
    key?: (x: T) => any,
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

  function formatChange(curr: number, prev: number) {
    if (!Number.isFinite(prev) || prev <= 0) {
      if (!curr) return { value: "0%", trend: "up" as const };
      return { value: "new", trend: "up" as const };
    }
    const diff = curr - prev;
    const pct = Math.round((diff / prev) * 100);
    return { value: `${diff >= 0 ? "+" : ""}${pct}%`, trend: diff >= 0 ? ("up" as const) : ("down" as const) };
  }

  const groupsWin = windowCounts(tokenCallsPlain as any[], getTs, (t: any) => t.group_id);
  const tokensWin = windowCounts(tokenCallsPlain as any[], getTs, (t: any) => t.token_address);
  const callsWin = windowCounts(tokenCallsPlain as any[], getTs);
  const callsLabel = "Token Calls";
  const periodLabel = "in 24h";
  const usersWin = windowCounts(usersPlain as any[], (u: any) => (u?.createdAt as string) || (u?.updatedAt as string));

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
  } catch {}

  const callsValue = statsSnapshot?.calls_total ?? tokenCallsPlain.length;

  // Compute 24h growth percentages relative to totals (never negative)
  const pctUp = (gain: number, total: number) => {
    if (!Number.isFinite(total) || total <= 0) return "0%";
    const g = Math.max(0, gain || 0);
    const pct = Math.round((g / total) * 100);
    return `${pct}%`;
  };

  const totals = {
    groups: statsSnapshot?.group_count ?? uniq(tokenCallsPlain as any[], (t: any) => t.group_id),
    users: statsSnapshot?.users_count ?? (usersPlain as any[]).length,
    tokens: statsSnapshot?.token_count ?? uniq(tokenCallsPlain as any[], (t: any) => t.token_address),
    calls: statsSnapshot?.calls_total ?? tokenCallsPlain.length,
  } as const;

  const gains24h = {
    groups: statsSnapshot?.groups_24h ?? groupsWin.curr,
    users: statsSnapshot?.users_24h ?? usersWin.curr,
    tokens: statsSnapshot?.tokens_24h ?? tokensWin.curr,
    calls: statsSnapshot?.calls_24h ?? callsWin.curr,
  } as const;

  const stats = [
    {
      title: "Groups",
      value: totals.groups.toLocaleString(),
      change: { value: pctUp(gains24h.groups, totals.groups), trend: "up" as const },
      icon: <RiGroupLine size={20} aria-hidden="true" suppressHydrationWarning />,
    },
    {
      title: "Users",
      value: totals.users.toLocaleString(),
      change: { value: pctUp(gains24h.users, totals.users), trend: "up" as const },
      icon: <RiUserLine size={20} aria-hidden="true" suppressHydrationWarning />,
    },
    {
      title: "Tokens",
      value: totals.tokens.toLocaleString(),
      change: { value: pctUp(gains24h.tokens, totals.tokens), trend: "up" as const },
      icon: <RiDatabaseLine size={20} aria-hidden="true" suppressHydrationWarning />,
    },
    {
      title: callsLabel,
      value: callsValue.toLocaleString(),
      change: { value: pctUp(gains24h.calls, totals.calls), trend: "up" as const },
      icon: <RiBarChartLine size={20} aria-hidden="true" suppressHydrationWarning />,
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
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
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
              <h1 className="text-2xl font-semibold">Hey, {adminName}!</h1>
              <p className="text-sm text-muted-foreground">
                Here&rsquo;s an overview of your data. Choose a database to explore.
              </p>
            </div>
          </div>
          {/* Numbers (24h, live-updated from /api/rnd/stats) */}
          <StatsLive initial={stats} periodLabel={periodLabel} />
          <DbLists tokenCalls={tokenCallsPlain} users={usersPlain} />
        </div>
      </SidebarInset>
      <SystemStatus tokenCalls={tokenCallsPlain} users={usersPlain} />
    </SidebarProvider>
  );
}
