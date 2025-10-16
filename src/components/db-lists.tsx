"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, CopyIcon, DownloadIcon, EyeIcon } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type GenericRecord = Record<string, unknown>;

type Props = {
    tokenCalls: unknown[];
    users: unknown[];
    groupMonthlyTokens: unknown[];
};

type TabKey = "token-calls" | "users" | "group-monthly";

const TAB_ORDER: TabKey[] = ["token-calls", "users", "group-monthly"];

const toNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
};

const formatDate = (value: unknown): string => {
    if (!value) return "—";
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatNumber = (value: unknown): string => {
    const num = toNumber(value);
    if (num === null) return "—";
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const formatMcap = (value: unknown): string => {
    const num = toNumber(value);
    if (num === null) return "—";
    if (num >= 1_000_000_000) {
        return `$${(num / 1_000_000_000).toFixed(2)}B`;
    }
    if (num >= 1_000_000) {
        return `$${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
        return `$${(num / 1_000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
};

const toMillis = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value instanceof Date) return value.getTime() || 0;
    return 0;
};

const callTimestamp = (record: GenericRecord): number => {
    const fallback = (record.first_poster as GenericRecord | undefined)?.posted_at;
    return toMillis(record.last_updated ?? record.updatedAt ?? record.createdAt ?? fallback);
};

const userTimestamp = (record: GenericRecord): number => {
    return toMillis(record.updatedAt ?? record.createdAt ?? record.joined_at);
};

const groupMonthlyTimestamp = (record: GenericRecord): number => {
    return toMillis(record.updatedAt ?? record.last_updated ?? record.createdAt ?? record.month);
};

const asRecords = (value: unknown[]): GenericRecord[] =>
    Array.isArray(value)
        ? value.filter((item): item is GenericRecord => Boolean(item) && typeof item === "object")
        : [];

export function DbLists({ tokenCalls, users, groupMonthlyTokens }: Props) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<{ title: string; data: GenericRecord } | null>(
        null,
    );
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>("token-calls");

    const sortBy = useCallback(
        (records: GenericRecord[], getTimestamp: (record: GenericRecord) => number) =>
            [...records].sort((a, b) => getTimestamp(b) - getTimestamp(a)),
        [],
    );

    const [liveCalls, setLiveCalls] = useState<GenericRecord[]>(
        sortBy(asRecords(tokenCalls), callTimestamp).slice(0, 100),
    );
    const [liveUsers, setLiveUsers] = useState<GenericRecord[]>(
        sortBy(asRecords(users), userTimestamp).slice(0, 100),
    );
    const [liveGroupMonthly, setLiveGroupMonthly] = useState<GenericRecord[]>(
        sortBy(asRecords(groupMonthlyTokens), groupMonthlyTimestamp).slice(0, 100),
    );

    useEffect(() => {
        let cancelled = false;

        const fetchTokenCalls = async () => {
            try {
                const res = await fetch("/api/rnd/token-calls?limit=100", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled || !Array.isArray(data)) return;
                setLiveCalls(sortBy(asRecords(data), callTimestamp).slice(0, 100));
            } catch {
                // ignore fetch errors
            }
        };

        fetchTokenCalls();
        const id = setInterval(fetchTokenCalls, 10_000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [sortBy]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch("/api/rnd/users?limit=100", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled || !Array.isArray(data)) return;
                setLiveUsers(sortBy(asRecords(data), userTimestamp).slice(0, 100));
            } catch {
                // ignore fetch errors
            }
        };
        load();
        const id = setInterval(load, 30_000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [sortBy]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch("/api/rnd/group-monthly-tokens?limit=100", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled || !Array.isArray(data)) return;
                setLiveGroupMonthly(
                    sortBy(asRecords(data), groupMonthlyTimestamp).slice(0, 100),
                );
            } catch {
                // ignore fetch errors
            }
        };
        load();
        const id = setInterval(load, 30_000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [sortBy]);

    const handleCopy = useCallback(async (value: string) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1_500);
        } catch {
            // ignore clipboard errors
        }
    }, []);

    const handleViewDetails = useCallback((title: string, data: GenericRecord) => {
        setSelected({ title, data });
        setOpen(true);
    }, []);

    const jsonString = useMemo(
        () => (selected ? JSON.stringify(selected.data, null, 2) : ""),
        [selected],
    );

    const downloadCSV = useCallback((data: GenericRecord[], filename: string) => {
        if (!data.length) return;

        const keys = new Set<string>();
        for (const item of data) {
            Object.keys(item).forEach((key) => keys.add(key));
        }
        const headers = Array.from(keys);
        const csv = [
            headers.join(","),
            ...data.map((item) =>
                headers
                    .map((header) => {
                        const value = item[header];
                        if (value === null || value === undefined) return "";
                        if (typeof value === "object") {
                            return JSON.stringify(value).replace(/"/g, '""');
                        }
                        return String(value).replace(/"/g, '""');
                    })
                    .map((field) => `"${field}"`)
                    .join(","),
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const tokenColumns = useMemo<ColumnDef<GenericRecord, unknown>[]>(() => {
        return [
            {
                id: "token",
                header: "Token",
                accessorFn: (row) => {
                    const info = row.token_info as GenericRecord | undefined;
                    const name = typeof info?.name === "string" ? info.name : "";
                    const symbol = typeof info?.symbol === "string" ? info.symbol : "";
                    const address = typeof row.token_address === "string" ? row.token_address : "";
                    return [name, symbol, address].filter(Boolean).join(" ").trim();
                },
                cell: ({ row }) => {
                    const record = row.original;
                    const info = record.token_info as GenericRecord | undefined;
                    const logo = typeof info?.logo === "string" ? info.logo : undefined;
                    const tokenName =
                        typeof info?.name === "string" && info.name.trim().length > 0
                            ? info.name
                            : "Unknown Token";
                    const tokenSymbol =
                        typeof info?.symbol === "string" && info.symbol.trim().length > 0
                            ? info.symbol
                            : "";
                    const address =
                        typeof record.token_address === "string" ? record.token_address : "";
                    const secondary = tokenSymbol || (address ? address.slice(0, 6) : "—");

                    return (
                        <div className="flex min-w-[180px] items-center gap-2">
                            {logo ? (
                                <img
                                    src={logo}
                                    alt={tokenName}
                                    className="h-8 w-8 rounded-full object-cover"
                                    onError={(event) => {
                                        (event.currentTarget as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            ) : null}
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate font-medium">{tokenName}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {secondary}
                                </span>
                            </div>
                        </div>
                    );
                },
                filterFn: "includesString",
            },
            {
                accessorKey: "group_id",
                header: "Group ID",
                cell: ({ row }) => (
                    <span className="font-mono text-xs">
                        {typeof row.original.group_id === "string"
                            ? row.original.group_id
                            : "—"}
                    </span>
                ),
            },
            {
                id: "poster",
                header: "First Poster",
                accessorFn: (row) => {
                    const poster = row.first_poster as GenericRecord | undefined;
                    const firstName = typeof poster?.first_name === "string" ? poster.first_name : "";
                    const username = typeof poster?.username === "string" ? poster.username : "";
                    return [firstName, username].filter(Boolean).join(" ").trim();
                },
                cell: ({ row }) => {
                    const poster = row.original.first_poster as GenericRecord | undefined;
                    const displayName =
                        typeof poster?.first_name === "string" && poster.first_name.trim().length > 0
                            ? poster.first_name
                            : typeof poster?.username === "string"
                                ? poster.username
                                : "Unknown";
                    const username =
                        typeof poster?.username === "string" && poster.username.trim().length > 0
                            ? poster.username
                            : "—";
                    return (
                        <div className="flex min-w-[140px] flex-col">
                            <span className="truncate text-sm font-medium">{displayName}</span>
                            <span className="text-xs text-muted-foreground">@{username}</span>
                        </div>
                    );
                },
                filterFn: "includesString",
            },
            {
                accessorKey: "last_mcap",
                header: "Market Cap",
                cell: ({ row }) => (
                    <span className="tabular-nums font-medium">
                        {formatMcap(row.original.last_mcap)}
                    </span>
                ),
            },
            {
                accessorKey: "ath_mcap",
                header: "ATH",
                cell: ({ row }) => (
                    <span className="tabular-nums text-green-600 dark:text-green-400">
                        {formatMcap(row.original.ath_mcap)}
                    </span>
                ),
            },
            {
                accessorKey: "post_count",
                header: "Posts",
                cell: ({ row }) => (
                    <Badge variant="secondary" className="tabular-nums">
                        {formatNumber(row.original.post_count)}
                    </Badge>
                ),
            },
            {
                accessorKey: "last_updated",
                header: "Last Updated",
                cell: ({ row }) => (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(row.original.last_updated ?? row.original.updatedAt)}
                    </span>
                ),
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewDetails("Token Call Details", row.original)}
                    >
                        <EyeIcon className="h-4 w-4" />
                        <span className="sr-only">View token call</span>
                    </Button>
                ),
            },
        ];
    }, [handleViewDetails]);

    const userColumns = useMemo<ColumnDef<GenericRecord, unknown>[]>(() => {
        return [
            {
                id: "user",
                header: "User",
                accessorFn: (row) => {
                    const firstName = typeof row.first_name === "string" ? row.first_name : "";
                    const username = typeof row.username === "string" ? row.username : "";
                    return [firstName, username].filter(Boolean).join(" ").trim();
                },
                cell: ({ row }) => {
                    const firstName =
                        typeof row.original.first_name === "string"
                            ? row.original.first_name
                            : "Unknown";
                    const username =
                        typeof row.original.username === "string" && row.original.username.trim().length > 0
                            ? row.original.username
                            : "—";
                    return (
                        <div className="flex min-w-[150px] flex-col">
                            <span className="font-medium">{firstName}</span>
                            <span className="text-xs text-muted-foreground">@{username}</span>
                        </div>
                    );
                },
                filterFn: "includesString",
            },
            {
                accessorKey: "user_id",
                header: "User ID",
                cell: ({ row }) => (
                    <span className="font-mono text-xs">
                        {typeof row.original.user_id === "string"
                            ? row.original.user_id
                            : "—"}
                    </span>
                ),
            },
            {
                accessorKey: "is_active",
                header: "Status",
                cell: ({ row }) => {
                    const isActive = row.original.is_active === true;
                    return (
                        <Badge
                            variant={isActive ? "default" : "secondary"}
                            className={cn("w-fit", isActive && "bg-green-600 hover:bg-green-700")}
                        >
                            {isActive ? "Active" : "Inactive"}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: "joined_at",
                header: "Joined",
                cell: ({ row }) => (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(row.original.joined_at)}
                    </span>
                ),
            },
            {
                accessorKey: "updatedAt",
                header: "Last Updated",
                cell: ({ row }) => (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(row.original.updatedAt)}
                    </span>
                ),
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewDetails("User Details", row.original)}
                    >
                        <EyeIcon className="h-4 w-4" />
                        <span className="sr-only">View user details</span>
                    </Button>
                ),
            },
        ];
    }, [handleViewDetails]);

    const groupMonthlyColumns = useMemo<ColumnDef<GenericRecord, unknown>[]>(() => {
        return [
            {
                accessorKey: "group_id",
                header: "Group ID",
                cell: ({ row }) => (
                    <span className="font-mono text-xs">
                        {typeof row.original.group_id === "string"
                            ? row.original.group_id
                            : "—"}
                    </span>
                ),
            },
            {
                accessorKey: "month",
                header: "Month",
                cell: ({ row }) => (
                    <span className="font-medium">
                        {typeof row.original.month === "string" ? row.original.month : "—"}
                    </span>
                ),
            },
            {
                accessorKey: "token_count",
                header: "Token Count",
                cell: ({ row }) => (
                    <Badge variant="secondary" className="tabular-nums">
                        {formatNumber(row.original.token_count)}
                    </Badge>
                ),
            },
            {
                accessorKey: "total_posts",
                header: "Total Posts",
                cell: ({ row }) => (
                    <span className="tabular-nums">{formatNumber(row.original.total_posts)}</span>
                ),
            },
            {
                accessorKey: "updatedAt",
                header: "Last Updated",
                cell: ({ row }) => (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(row.original.updatedAt ?? row.original.last_updated)}
                    </span>
                ),
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewDetails("Group Monthly Details", row.original)}
                    >
                        <EyeIcon className="h-4 w-4" />
                        <span className="sr-only">View group monthly details</span>
                    </Button>
                ),
            },
        ];
    }, [handleViewDetails]);

    const tabIndex = Math.max(TAB_ORDER.indexOf(activeTab), 0);

    return (
        <>
            <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as TabKey)}
                className="w-full"
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-lg font-semibold">Explore Data</h2>
                    <TabsList className="relative flex w-full max-w-md gap-2 -mb-[14px]">
                            <span
                                className="pointer-events-none absolute bottom-0 left-0 h-full rounded-t-lg border border-b-0 border-border bg-muted/20 shadow-sm transition-all duration-500 ease-in-out"
                                style={{
                                    transform: `translateX(calc(${tabIndex * 100}% + ${tabIndex * 8}px))`,
                                    width: `calc(${100 / TAB_ORDER.length}% - ${(TAB_ORDER.length - 1) * 8 / TAB_ORDER.length}px)`,
                                    transitionDelay: '75ms'
                                }}
                                aria-hidden="true"
                            />
                            <TabsTrigger
                                value="token-calls"
                                className="relative z-10 flex-1 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-300 delay-100 data-[state=active]:text-foreground"
                            >
                                Token Calls
                            </TabsTrigger>
                            <TabsTrigger
                                value="users"
                                className="relative z-10 flex-1 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-300 delay-100 data-[state=active]:text-foreground"
                            >
                                Users
                            </TabsTrigger>
                            <TabsTrigger
                                value="group-monthly"
                                className="relative z-10 flex-1 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-300 delay-100 data-[state=active]:text-foreground"
                            >
                                Group Monthly
                            </TabsTrigger>
                        </TabsList>
                </div>

                <TabsContent value="token-calls" className="mt-0">
                    <div className="rounded-b-lg border border-border bg-card">
                        <div className="flex flex-col gap-3 border-b bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">Token Calls</h3>
                                <p className="text-sm text-muted-foreground">
                                    Most recent token activity with live updates every 10 seconds.
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => downloadCSV(liveCalls, "token-calls.csv")}
                                disabled={!liveCalls.length}
                                className="gap-2"
                                aria-label="Download token calls as CSV"
                            >
                                <DownloadIcon className="h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                        <div className="p-6 pt-4">
                            <DataTable<GenericRecord>
                                data={liveCalls}
                                columns={tokenColumns}
                                searchColumn="token"
                                searchPlaceholder="Search tokens, symbols, or addresses..."
                                emptyMessage="No token call data available."
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="users" className="mt-0">
                    <div className="rounded-b-lg border border-border bg-card">
                        <div className="flex flex-col gap-3 border-b bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">Users</h3>
                                <p className="text-sm text-muted-foreground">
                                    Latest users interacting with the bot and their status.
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => downloadCSV(liveUsers, "users.csv")}
                                disabled={!liveUsers.length}
                                className="gap-2"
                                aria-label="Download users as CSV"
                            >
                                <DownloadIcon className="h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                        <div className="p-6 pt-4">
                            <DataTable<GenericRecord>
                                data={liveUsers}
                                columns={userColumns}
                                searchColumn="user"
                                searchPlaceholder="Search names or usernames..."
                                emptyMessage="No users found."
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="group-monthly" className="mt-0">
                    <div className="rounded-b-lg border border-border bg-card">
                        <div className="flex flex-col gap-3 border-b bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">Group Monthly Tokens</h3>
                                <p className="text-sm text-muted-foreground">
                                    Aggregated monthly metrics per group with token counts.
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => downloadCSV(liveGroupMonthly, "group-monthly-tokens.csv")}
                                disabled={!liveGroupMonthly.length}
                                className="gap-2"
                                aria-label="Download group monthly tokens as CSV"
                            >
                                <DownloadIcon className="h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                        <div className="p-6 pt-4">
                            <DataTable<GenericRecord>
                                data={liveGroupMonthly}
                                columns={groupMonthlyColumns}
                                searchColumn="group_id"
                                searchPlaceholder="Search group IDs..."
                                emptyMessage="No group monthly tokens found."
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>{selected?.title ?? "Details"}</SheetTitle>
                    </SheetHeader>
                    <div className="p-4 pt-0">
                        <div className="relative max-h-[70vh] overflow-auto rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                            <div className="sticky top-0 right-0 flex justify-end gap-2 p-2 pb-0">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCopy(jsonString)}
                                    disabled={!jsonString}
                                    className="h-7 gap-2 bg-yellow-500/10 px-2 hover:bg-yellow-500/15"
                                    aria-label={copied ? "Copied JSON" : "Copy JSON"}
                                >
                                    {copied ? (
                                        <>
                                            <CheckIcon className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <CopyIcon className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Copy</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                            <pre className="whitespace-pre-wrap break-words p-3 pt-0 text-xs font-mono leading-5 md:text-sm">
                                {jsonString}
                            </pre>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
