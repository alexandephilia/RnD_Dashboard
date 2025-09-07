"use client";

import * as React from "react";
import { StatsGrid } from "@/components/stats-grid";

type Change = { value: string; trend: "up" | "down" };
type Stat = { title: string; value: string; change: Change; icon: React.ReactNode };

export function StatsLive({ initial, periodLabel, showChange = true }: { initial: Stat[]; periodLabel?: string; showChange?: boolean }) {
  const [stats, setStats] = React.useState<Stat[]>(initial);

  React.useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        const res = await fetch("/api/rnd/stats", { cache: "no-store" });
        if (!active || !res.ok) return;
        const s = await res.json();
        const pctUp = (gain?: number, total?: number) => {
          if (typeof gain !== "number" || typeof total !== "number" || total <= 0) return "0%";
          const pct = Math.round(Math.max(0, gain) / total * 100);
          return `${pct}%`;
        };

        setStats((prev) =>
          prev.map((it) => {
            const t = it.title.toLowerCase();
            if (t === "groups") {
              if (typeof s?.group_count === "number") {
                const change = { value: pctUp(s?.groups_24h, s?.group_count), trend: "up" as const };
                return { ...it, value: s.group_count.toLocaleString(), change };
              }
            }
            if (t === "users") {
              if (typeof s?.users_count === "number") {
                const change = { value: pctUp(s?.users_24h, s?.users_count), trend: "up" as const };
                return { ...it, value: s.users_count.toLocaleString(), change };
              }
            }
            if (t === "tokens") {
              if (typeof s?.token_count === "number") {
                const change = { value: pctUp(s?.tokens_24h, s?.token_count), trend: "up" as const };
                return { ...it, value: s.token_count.toLocaleString(), change };
              }
            }
            if (t.startsWith("token calls")) {
              if (it.title.includes("1h") && typeof s?.calls_1h === "number") {
                return { ...it, value: s.calls_1h.toLocaleString() };
              }
              if (it.title.includes("24h") && typeof s?.calls_24h === "number") {
                return { ...it, value: s.calls_24h.toLocaleString() };
              }
              if (typeof s?.calls_total === "number") {
                const change = { value: pctUp(s?.calls_24h, s?.calls_total), trend: "up" as const };
                return { ...it, value: s.calls_total.toLocaleString(), change };
              }
            }
            return it;
          }),
        );
      } catch {
        /* ignore */
      }
    };
    update();
    const id = setInterval(update, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return <StatsGrid stats={stats} periodLabel={periodLabel} showChange={showChange} />;
}
