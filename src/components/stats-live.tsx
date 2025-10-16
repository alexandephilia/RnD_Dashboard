"use client";

import * as React from "react";
import { StatsGrid } from "@/components/stats-grid";

type Change = { value: string; trend: "up" | "down" };
type Stat = { title: string; value: string; change: Change; icon: React.ReactNode; sparklineData?: number[] };

export function StatsLive({ initial, periodLabel, showChange = true }: { initial: Stat[]; periodLabel?: string; showChange?: boolean }) {
  const [stats, setStats] = React.useState<Stat[]>(initial);
  const [sparklineHistory, setSparklineHistory] = React.useState<Record<string, number[]>>(() => {
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
          
          if (typeof s?.group_count === "number") {
            newHistory["groups"] = [...(prevHistory["groups"] || []), s.group_count].slice(-maxPoints);
          }
          if (typeof s?.users_count === "number") {
            newHistory["users"] = [...(prevHistory["users"] || []), s.users_count].slice(-maxPoints);
          }
          if (typeof s?.token_count === "number") {
            newHistory["tokens"] = [...(prevHistory["tokens"] || []), s.token_count].slice(-maxPoints);
          }
          if (typeof s?.calls_total === "number") {
            newHistory["token calls"] = [...(prevHistory["token calls"] || []), s.calls_total].slice(-maxPoints);
          }
          
          // Update stats with new history
          setStats((prev) =>
            prev.map((it) => {
              const t = it.title.toLowerCase();
              if (t === "groups" && typeof s?.group_count === "number") {
                const change = { value: pctUp(s?.groups_24h, s?.group_count), trend: "up" as const };
                return { ...it, value: s.group_count.toLocaleString(), change, sparklineData: newHistory["groups"] };
              }
              if (t === "users" && typeof s?.users_count === "number") {
                const change = { value: pctUp(s?.users_24h, s?.users_count), trend: "up" as const };
                return { ...it, value: s.users_count.toLocaleString(), change, sparklineData: newHistory["users"] };
              }
              if (t === "tokens" && typeof s?.token_count === "number") {
                const change = { value: pctUp(s?.tokens_24h, s?.token_count), trend: "up" as const };
                return { ...it, value: s.token_count.toLocaleString(), change, sparklineData: newHistory["tokens"] };
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
                  return { ...it, value: s.calls_total.toLocaleString(), change, sparklineData: newHistory["token calls"] };
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
