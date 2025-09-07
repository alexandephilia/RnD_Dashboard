"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  tokenCalls: unknown[];
  users: unknown[];
};

export function DbLists({ tokenCalls, users }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ title: string; data: unknown } | null>(
    null,
  );

  // Helpers to consistently order lists newest-first
  const toMillis = (v: any): number => {
    if (!v) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : 0;
    }
    if (v instanceof Date) return +v || 0;
    return 0;
  };
  const callTs = (c: any): number =>
    toMillis(
      c?.last_updated ?? c?.updatedAt ?? c?.createdAt ?? c?.first_poster?.posted_at,
    );
  const userTs = (u: any): number =>
    toMillis(u?.updatedAt ?? u?.createdAt ?? u?.joined_at);

  const sortCalls = (arr: unknown[]) =>
    [...(Array.isArray(arr) ? arr : [])].sort((a, b) => callTs(b) - callTs(a));
  const sortUsers = (arr: unknown[]) =>
    [...(Array.isArray(arr) ? arr : [])].sort((a, b) => userTs(b) - userTs(a));

  const [liveCalls, setLiveCalls] = useState<unknown[]>(
    sortCalls(tokenCalls).slice(0, 100),
  );
  const [liveUsers, setLiveUsers] = useState<unknown[]>(
    sortUsers(users).slice(0, 100),
  );

  // Subscribe to SSE for token calls; fallback to polling if SSE fails
  useEffect(() => {
    let closed = false;
    try {
      const es = new EventSource("/api/rnd/token-calls/stream");
      es.onmessage = (e) => {
        try {
          const obj = JSON.parse(e.data);
          setLiveCalls((prev) => sortCalls([obj, ...(prev as any[])]).slice(0, 100));
        } catch {
          // ignore non-JSON lines
        }
      };
      es.onerror = () => {
        es.close();
      };
      return () => {
        closed = true;
        es.close();
      };
    } catch {
      // ignore
    }
    // polling fallback
    const id = setInterval(async () => {
      if (closed) return;
      try {
        const res = await fetch("/api/rnd/token-calls?limit=100", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) setLiveCalls(sortCalls(data).slice(0, 100));
      } catch {
        // ignore
      }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Poll users regularly from proxy
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/rnd/users?limit=100", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data)) setLiveUsers(sortUsers(data).slice(0, 100));
      } catch {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Token Calls</CardTitle>
            <span className="text-muted-foreground/60 text-sm">Latest Events</span>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/20 p-3 pb-0 max-h-96 overflow-auto">
              {liveCalls?.length ? (
                <ul className="space-y-2">
                  {liveCalls.map((item, idx) => (
                    <li
                      key={idx}
                      className="overflow-x-auto cursor-pointer"
                      onClick={() => {
                        setSelected({ title: "Token Call", data: item });
                        setOpen(true);
                      }}
                    >
                      <code className="block min-w-full w-max text-xs font-mono whitespace-nowrap p-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors">
                        {JSON.stringify(item)}
                      </code>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No token call data found.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Users</CardTitle>
            <span className="text-muted-foreground/60 text-sm">Latest Users</span>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/20 p-3 pb-0 max-h-96 overflow-auto">
              {liveUsers?.length ? (
                <ul className="space-y-2">
                  {liveUsers.map((item, idx) => (
                    <li
                      key={idx}
                      className="overflow-x-auto cursor-pointer"
                      onClick={() => {
                        setSelected({ title: "User", data: item });
                        setOpen(true);
                      }}
                    >
                      <code className="block min-w-full w-max text-xs font-mono whitespace-nowrap p-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors">
                        {JSON.stringify(item)}
                      </code>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No users found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selected?.title ?? "Details"}</SheetTitle>
          </SheetHeader>
          <div className="p-4 pt-0">
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 max-h-[70vh] overflow-auto">
              <pre className="text-xs md:text-sm font-mono whitespace-pre-wrap break-words leading-5">
                {selected ? JSON.stringify(selected.data, null, 2) : ""}
              </pre>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
