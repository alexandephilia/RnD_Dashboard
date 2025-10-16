"use client";

import * as React from "react";
import { StatsGrid } from "@/components/stats-grid";

type Change = { value: string; trend: "up" | "down" };
type Stat = { title: string; value: string; change: Change; icon: React.ReactNode; sparklineData?: number[] };

export function StatsLive({ initial, periodLabel, showChange = true }: { initial: Stat[]; periodLabel?: string; showChange?: boolean }) {
  const [stats, setStats] = React.useState<Stat[]>(initial);
  const [_lastValues, setLastValues] = React.useState<Record<string, number>>({});
  const [sparklineHistory, setSparklineHistory] = React.useState<Record<string, number[]>>(() => {
    // Try to load from localStorage first
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("rnd_stats_sparkline_v1");
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, number[]>;
          if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
            return parsed; // Use saved data if available
          }
        }
      } catch {}
    }
    // Otherwise use SSR data
    const seed: Record<string, number[]> = {};
    for (const it of initial) {
      if (it.sparklineData && it.sparklineData.length) {
        seed[it.title.toLowerCase()] = it.sparklineData;
      }
    }
    return seed;
  });

  React.useEffect(() => {
    // Update initial stats with loaded sparkline data
    setStats((prev) =>
      prev.map((it) => {
        const t = it.title.toLowerCase();
        const sparklineData = sparklineHistory[t];
        if (sparklineData && sparklineData.length > 0) {
          return { ...it, sparklineData };
        }
        return it;
      })
    );

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

        const maxPoints = 48; // Store more points for smoother history
        
        // Calculate deltas (new activity since last check) instead of totals
        setLastValues((prevLast) => {
          const newLast: Record<string, number> = {};
          
          setSparklineHistory((prevHistory) => {
            const newHistory = { ...prevHistory };
            
            if (typeof s?.group_count === "number") {
              const delta = Math.max(0, s.group_count - (prevLast["groups"] || s.group_count));
              newHistory["groups"] = [...(prevHistory["groups"] || []), delta].slice(-maxPoints);
              newLast["groups"] = s.group_count;
            }
            if (typeof s?.users_count === "number") {
              const delta = Math.max(0, s.users_count - (prevLast["users"] || s.users_count));
              newHistory["users"] = [...(prevHistory["users"] || []), delta].slice(-maxPoints);
              newLast["users"] = s.users_count;
            }
            if (typeof s?.token_count === "number") {
              const delta = Math.max(0, s.token_count - (prevLast["tokens"] || s.token_count));
              newHistory["tokens"] = [...(prevHistory["tokens"] || []), delta].slice(-maxPoints);
              newLast["tokens"] = s.token_count;
            }
            if (typeof s?.calls_total === "number") {
              const delta = Math.max(0, s.calls_total - (prevLast["token calls"] || s.calls_total));
              newHistory["token calls"] = [...(prevHistory["token calls"] || []), delta].slice(-maxPoints);
              newLast["token calls"] = s.calls_total;
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
            
            try {
              localStorage.setItem("rnd_stats_sparkline_v1", JSON.stringify(newHistory));
            } catch {}
            return newHistory;
          });
          
          return newLast;
        });
      } catch {
        /* ignore */
      }
    };
    update();
    // Poll every 5 seconds for more real-time updates
    const id = setInterval(update, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <StatsGrid stats={stats} periodLabel={periodLabel} showChange={showChange} />;
}
