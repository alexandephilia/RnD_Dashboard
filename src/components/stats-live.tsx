"use client";

import * as React from "react";
import { StatsGrid } from "@/components/stats-grid";

type Change = { value: string; trend: "up" | "down" };
type Stat = { title: string; value: string; change: Change; icon: React.ReactNode; sparklineData?: number[] };

export function StatsLive({ initial, periodLabel, showChange = true }: { initial: Stat[]; periodLabel?: string; showChange?: boolean }) {
  const [stats, setStats] = React.useState<Stat[]>(initial);
  const [, setSparklineHistory] = React.useState<Record<string, number[]>>(() => {
    const seed: Record<string, number[]> = {};
    for (const it of initial) {
      if (it.sparklineData && it.sparklineData.length) {
        seed[it.title.toLowerCase()] = it.sparklineData;
      }
    }
    return seed;
  });

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

        const maxPoints = 24;

        // Update both history and stats together
        setSparklineHistory((prevHistory) => {
          const newHistory = { ...prevHistory };
          const appendOrHold = (key: string, value?: number) => {
            const prevSeries = prevHistory[key] || [];
            if (typeof value === "number") {
              newHistory[key] = [...prevSeries, value].slice(-maxPoints);
            } else if (prevSeries.length) {
              const last = prevSeries[prevSeries.length - 1];
              if (typeof last === "number") {
                newHistory[key] = [...prevSeries, last].slice(-maxPoints);
              }
            }
            return newHistory[key] || prevSeries;
          };

          const groupsHistory = appendOrHold("groups", typeof s?.group_count === "number" ? s.group_count : undefined);
          const usersHistory = appendOrHold("users", typeof s?.users_count === "number" ? s.users_count : undefined);
          const tokensHistory = appendOrHold("tokens", typeof s?.token_count === "number" ? s.token_count : undefined);
          const callsHistory = appendOrHold("token calls", typeof s?.calls_total === "number" ? s.calls_total : undefined);

          // Update stats with new history
          setStats((prev) =>
            prev.map((it) => {
              const t = it.title.toLowerCase();
              if (t === "groups") {
                const change =
                  typeof s?.group_count === "number"
                    ? { value: pctUp(s?.groups_24h, s?.group_count), trend: "up" as const }
                    : it.change;
                const value = typeof s?.group_count === "number" ? s.group_count.toLocaleString() : it.value;
                return { ...it, value, change, sparklineData: groupsHistory };
              }
              if (t === "users") {
                const change =
                  typeof s?.users_count === "number"
                    ? { value: pctUp(s?.users_24h, s?.users_count), trend: "up" as const }
                    : it.change;
                const value = typeof s?.users_count === "number" ? s.users_count.toLocaleString() : it.value;
                return { ...it, value, change, sparklineData: usersHistory };
              }
              if (t === "tokens") {
                const change =
                  typeof s?.token_count === "number"
                    ? { value: pctUp(s?.tokens_24h, s?.token_count), trend: "up" as const }
                    : it.change;
                const value = typeof s?.token_count === "number" ? s.token_count.toLocaleString() : it.value;
                return { ...it, value, change, sparklineData: tokensHistory };
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
                  return { ...it, value: s.calls_total.toLocaleString(), change, sparklineData: callsHistory };
                }
                if (callsHistory.length) {
                  return { ...it, sparklineData: callsHistory };
                }
              }
              return it;
            }),
          );

          return newHistory;
        });
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
