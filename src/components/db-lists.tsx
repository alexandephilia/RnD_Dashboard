"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
    tokenCalls: unknown[];
    users: unknown[];
    groupMonthlyTokens: unknown[];
};

export function DbLists({ tokenCalls, users, groupMonthlyTokens }: Props) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<{ title: string; data: unknown } | null>(
        null,
    );
    const [copied, setCopied] = useState(false);

    // Helpers to consistently order lists newest-first
    const toMillis = (v: unknown): number => {
        if (!v) return 0;
        if (typeof v === "number") return v;
        if (typeof v === "string") {
            const t = Date.parse(v);
            return Number.isFinite(t) ? t : 0;
        }
        if (v instanceof Date) return +v || 0;
        return 0;
    };
    const callTs = (c: unknown): number => {
        const obj = c as Record<string, unknown>;
        return toMillis(
            obj?.last_updated ?? obj?.updatedAt ?? obj?.createdAt ?? (obj?.first_poster as Record<string, unknown>)?.posted_at,
        );
    };
    const userTs = (u: unknown): number => {
        const obj = u as Record<string, unknown>;
        return toMillis(obj?.updatedAt ?? obj?.createdAt ?? obj?.joined_at);
    };
    const groupMonthlyTs = (g: unknown): number => {
        const obj = g as Record<string, unknown>;
        return toMillis(
            obj?.updatedAt ?? obj?.last_updated ?? obj?.createdAt ?? obj?.month,
        );
    };

    const sortCalls = useCallback((arr: unknown[]) =>
        [...(Array.isArray(arr) ? arr : [])].sort((a, b) => callTs(b) - callTs(a)), []);
    const sortUsers = useCallback((arr: unknown[]) =>
        [...(Array.isArray(arr) ? arr : [])].sort((a, b) => userTs(b) - userTs(a)), []);
    const sortGroupMonthly = useCallback((arr: unknown[]) =>
        [...(Array.isArray(arr) ? arr : [])].sort((a, b) => groupMonthlyTs(b) - groupMonthlyTs(a)), []);

    const [liveCalls, setLiveCalls] = useState<unknown[]>(
        sortCalls(tokenCalls).slice(0, 100),
    );
    const [liveUsers, setLiveUsers] = useState<unknown[]>(
        sortUsers(users).slice(0, 100),
    );
    const [liveGroupMonthly, setLiveGroupMonthly] = useState<unknown[]>(
        sortGroupMonthly(groupMonthlyTokens).slice(0, 100),
    );

    // Use polling instead of SSE to avoid Vercel timeout issues
    useEffect(() => {
        let closed = false;

        const fetchTokenCalls = async () => {
            if (closed) return;
            try {
                const res = await fetch("/api/rnd/token-calls?limit=100", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (Array.isArray(data)) {
                    setLiveCalls(sortCalls(data).slice(0, 100));
                }
            } catch {
                // ignore
            }
        };

        // Initial fetch
        fetchTokenCalls();

        // Poll every 10 seconds for updates
        const id = setInterval(fetchTokenCalls, 10000);

        return () => {
            closed = true;
            clearInterval(id);
        };
    }, [sortCalls]);

    // Poll users regularly from proxy
    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await fetch("/api/rnd/users?limit=100", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (active && Array.isArray(data)) setLiveUsers(sortUsers(data).slice(0, 100));
            } catch { }
        };
        load();
        const id = setInterval(load, 30000);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, [sortUsers]);

    // Poll group monthly tokens regularly from proxy
    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await fetch("/api/rnd/group-monthly-tokens?limit=100", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (active && Array.isArray(data)) setLiveGroupMonthly(sortGroupMonthly(data).slice(0, 100));
            } catch { }
        };
        load();
        const id = setInterval(load, 30000);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, [sortGroupMonthly]);

    const jsonString = useMemo(
        () => (selected ? JSON.stringify(selected.data, null, 2) : ""),
        [selected],
    );

    const onCopy = async () => {
        if (!jsonString) return;
        try {
            await navigator.clipboard.writeText(jsonString);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // no-op
        }
    };

    const downloadCSV = (data: unknown[], filename: string) => {
        if (!data.length) return;

        // Get all unique keys from all objects
        const allKeys = new Set<string>();
        data.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                Object.keys(item as Record<string, unknown>).forEach(key => allKeys.add(key));
            }
        });

        const headers = Array.from(allKeys);
        const csvContent = [
            headers.join(','),
            ...data.map(item => {
                const obj = item as Record<string, unknown>;
                return headers.map(header => {
                    const value = obj[header];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
                    return String(value).replace(/"/g, '""');
                }).map(field => `"${field}"`).join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CardTitle>Token Calls</CardTitle>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadCSV(liveCalls, 'token-calls.csv')}
                                disabled={!liveCalls?.length}
                                aria-label="Download Token Calls as CSV"
                                title="Download as CSV"
                                className="h-4 w-4 p-0 hover:bg-muted cursor-pointer"
                            >   
                                <DownloadIcon className="!w-3 !h-3 text-yellow-500" />
                            </Button>
                        </div>
                        <span className="text-muted-foreground/60 text-sm">Latest Events</span>
                    </CardHeader>
                    <CardContent>
                        <div className="relative rounded-md border bg-muted/20 p-3 pb-0 max-h-96 overflow-auto">
                            {/* Fixed gradient overlays for the entire container */}
                            <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background via-background/95 via-background/85 via-background/70 via-background/50 via-background/30 via-background/15 to-transparent pointer-events-none z-20" />
                            <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background via-background/95 via-background/85 via-background/70 via-background/50 via-background/30 via-background/15 to-transparent pointer-events-none z-20" />

                            {liveCalls?.length ? (
                                <ul className="space-y-2">
                                    {liveCalls.map((item, idx) => (
                                        <li
                                            key={idx}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setSelected({ title: "Token Call", data: item });
                                                setOpen(true);
                                            }}
                                        >
                                            <div className="overflow-x-auto">
                                                <code className="block min-w-full w-max text-xs font-mono whitespace-nowrap p-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors">
                                                    {JSON.stringify(item)}
                                                </code>
                                            </div>
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
                        <div className="flex items-center gap-2">
                            <CardTitle>Users</CardTitle>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadCSV(liveUsers, 'users.csv')}
                                disabled={!liveUsers?.length}
                                aria-label="Download Users as CSV"
                                title="Download as CSV"
                                className="h-4 w-4 p-0 hover:bg-muted cursor-pointer"
                            >
                            <DownloadIcon className="!w-3 !h-3 text-yellow-500" />
                            </Button>
                        </div>
                        <span className="text-muted-foreground/60 text-sm">Latest Users</span>
                    </CardHeader>
                    <CardContent>
                        <div className="relative rounded-md border bg-muted/20 p-3 pb-0 max-h-96 overflow-auto">
                            {/* Fixed gradient overlays for the entire container */}
                            <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background via-background/95 via-background/85 via-background/70 via-background/50 via-background/30 via-background/15 to-transparent pointer-events-none z-20" />
                            <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background via-background/95 via-background/85 via-background/70 via-background/50 via-background/30 via-background/15 to-transparent pointer-events-none z-20" />

                            {liveUsers?.length ? (
                                <ul className="space-y-2">
                                    {liveUsers.map((item, idx) => (
                                        <li
                                            key={idx}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setSelected({ title: "User", data: item });
                                                setOpen(true);
                                            }}
                                        >
                                            <div className="overflow-x-auto">
                                                <code className="block min-w-full w-max text-xs font-mono whitespace-nowrap p-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors">
                                                    {JSON.stringify(item)}
                                                </code>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-sm text-muted-foreground">No users found.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CardTitle>Group Monthly Tokens</CardTitle>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadCSV(liveGroupMonthly, 'group-monthly-tokens.csv')}
                                disabled={!liveGroupMonthly?.length}
                                aria-label="Download Group Monthly Tokens as CSV"
                                title="Download as CSV"
                                className="h-4 w-4 p-0 hover:bg-muted cursor-pointer"
                            >
                                <DownloadIcon className="!w-3 !h-3 text-yellow-500" />
                            </Button>
                        </div>
                        <span className="text-muted-foreground/60 text-sm">Latest Aggregates</span>
                    </CardHeader>
                    <CardContent>
                        <div className="relative rounded-md border bg-muted/20 p-3 pb-0 max-h-96 overflow-auto">
                            {/* Fixed gradient overlays for the entire container */}
                            <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background via-background/95 via-background/85 via-background/70 via-background/50 via-background/30 via-background/15 to-transparent pointer-events-none z-20" />
                            <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background via-background/95 via-background/85 via-background/70 via-background/50 via-background/30 via-background/15 to-transparent pointer-events-none z-20" />

                            {liveGroupMonthly?.length ? (
                                <ul className="space-y-2">
                                    {liveGroupMonthly.map((item, idx) => (
                                        <li
                                            key={idx}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setSelected({ title: "Group Monthly", data: item });
                                                setOpen(true);
                                            }}
                                        >
                                            <div className="overflow-x-auto">
                                                <code className="block min-w-full w-max text-xs font-mono whitespace-nowrap p-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors">
                                                    {JSON.stringify(item)}
                                                </code>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-sm text-muted-foreground">No group monthly tokens found.</div>
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
                        <div className="relative rounded-lg border border-yellow-500/30 bg-yellow-500/10 max-h-[70vh] overflow-auto">
                            <div className="sticky top-0 right-0 flex justify-end p-2 pb-0 z-10">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={onCopy}
                                    disabled={!jsonString}
                                    aria-label={copied ? "Copied JSON" : "Copy JSON"}
                                    title={copied ? "Copied" : "Copy JSON"}
                                    className="h-7 px-2 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/40 backdrop-blur-sm"
                                >
                                    {copied ? (
                                        <>
                                            <CheckIcon size={14} />
                                            <span className="hidden sm:inline">Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <CopyIcon size={14} />
                                            <span className="hidden sm:inline">Copy</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                            <pre className="text-xs md:text-sm font-mono whitespace-pre-wrap break-words leading-5 p-3 pt-0">
                                {jsonString}
                            </pre>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
