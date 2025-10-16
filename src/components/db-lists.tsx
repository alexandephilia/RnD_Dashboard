"use client";

import { Press_Start_2P } from "next/font/google";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, CopyIcon, DownloadIcon, EyeIcon } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonTreeViewer } from "@/components/json-tree-viewer";
import { cn } from "@/lib/utils";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"] });

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
    const [activeScrubRow, setActiveScrubRow] = useState<string | null>(null);
    const [scrubValue, setScrubValue] = useState<number>(0);
    const [scrubOverlay, setScrubOverlay] = useState<{
        rowId: string;
        first: number;
        ath: number;
        left: number;
        top: number;
    } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [justClicked, setJustClicked] = useState(false);
    const [scrubVisual, setScrubVisual] = useState<number>(0); // visual bar, may lag behind
    const clickDelayRef = useRef<number | null>(null);


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

    const handleJsonValueCopy = useCallback((value: string) => {
        handleCopy(value);
    }, [handleCopy]);

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

    // Calculate percentiles for post_count tiers (used for percentile-based chips)
    const postTiers = useMemo(() => {
        const counts = liveCalls
            .map(call => toNumber(call.post_count) ?? 0)
            .filter(n => n > 0)
            .sort((a, b) => a - b);

        const getPct = (p: number) => counts.length ? (counts[Math.floor(counts.length * p)] || 0) : 0;
        
        return {
            p10: getPct(0.10),
            p15: getPct(0.15),
            p25: getPct(0.25),
            p50: getPct(0.50),
            p75: getPct(0.75),
            p90: getPct(0.90),
            sampleSize: counts.length,
        };
    }, [liveCalls]);

    const tokenColumns = useMemo<ColumnDef<GenericRecord, unknown>[]>(() => {
        return [
            {
                id: "token",
header: () => <div className="w-[220px] text-left">Token</div>,
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
                        <div className="flex w-[220px] items-center gap-2">
                            {logo ? (
                                <img
                                    src={logo}
                                    alt={tokenName}
                                    className="h-8 w-8 rounded-full object-cover"
                                    onError={(event) => {
                                        const img = event.currentTarget as HTMLImageElement;
                                        // Try fallback: use first 2 letters of token name as placeholder
                                        const initials = tokenName.slice(0, 2).toUpperCase();
                                        img.style.display = "none";
                                        // Create a fallback div
                                        const fallback = document.createElement("div");
                                        fallback.className = "h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium";
                                        fallback.textContent = initials;
                                        img.parentNode?.insertBefore(fallback, img);
                                    }}
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                    {tokenName.slice(0, 2).toUpperCase()}
                                </div>
                            )}
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
header: () => <div className="w-[140px] text-left">Group ID</div>,
                cell: ({ row }) => (
                    <div className="w-[140px] text-left">
                        {typeof row.original.group_id === "string" && row.original.group_id !== "—" ? (
                            <Badge 
                                variant="secondary" 
                                className="w-fit font-mono text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            >
                                {row.original.group_id}
                            </Badge>
                        ) : (
                            <span className="font-mono text-xs text-muted-foreground">—</span>
                        )}
                    </div>
                ),
            },
            {
                id: "poster",
header: () => <div className="w-[160px] text-center">First Poster</div>,
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
                        <div className="flex w-[160px] flex-col items-center">
                            <span className="truncate text-sm font-medium">{displayName}</span>
                            {username !== "—" ? (
                                <Badge 
                                    variant="secondary" 
                                    className="w-fit text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                >
                                    @{username}
                                </Badge>
                            ) : (
                                <span className="text-xs text-muted-foreground">@{username}</span>
                            )}
                        </div>
                    );
                },
                filterFn: "includesString",
            },
            {
                accessorKey: "first_mcap",
header: () => <div className="w-[120px] text-right">First Called</div>,
                cell: ({ row }) => {
                    const firstMcap = toNumber(row.original.first_mcap);
                    const athMcap = toNumber(row.original.ath_mcap);
                    const rowId = `${row.original.token_address}-${row.original.group_id}`;
                    const isActive = activeScrubRow === rowId;

                    const openOverlay = (target: HTMLElement) => {
                        const rect = target.getBoundingClientRect();
                        const left = rect.left + window.scrollX + rect.width / 2;
                        const top = rect.bottom + window.scrollY + 8;
                        setScrubOverlay({ rowId, first: firstMcap!, ath: athMcap!, left, top });
                    };

                    const handleActivate = (e?: React.MouseEvent<HTMLElement>) => {
                        if (firstMcap && athMcap) {
                            setActiveScrubRow(rowId);
                            const firstPct = Math.min(100, Math.max(0, (firstMcap / athMcap) * 100));
                            const init = Number.isFinite(firstPct) ? firstPct : 0;
                            setScrubValue(init);
                            setScrubVisual(init);
                            if (e) openOverlay(e.currentTarget as HTMLElement);
                        }
                    };

                    const handleDeactivate = () => {
                        setActiveScrubRow(null);
                        setScrubValue(0);
                        setScrubOverlay(null);
                    };

                    return (
                        <div className="relative w-[120px] text-right">
                            <button
                                className="tabular-nums font-medium hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors cursor-pointer"
                                onClick={(e) => handleActivate(e)}
                                onMouseEnter={(e) => handleActivate(e)}
                                disabled={!firstMcap || !athMcap}
                            >
                                {formatMcap(row.original.first_mcap)}
                            </button>
                        </div>
                    );
                },
            },
            {
                accessorKey: "ath_mcap",
header: () => <div className="w-[160px] text-right">ATH</div>,
                cell: ({ row }) => {
                    const ath = toNumber(row.original.ath_mcap);
                    const last = toNumber(row.original.last_mcap);
                    
                    // Calculate progress percentage (how close last_mcap is to ATH)
                    const progressPct = ath && last && ath > 0 
                        ? Math.min(100, (last / ath) * 100) 
                        : null;
                    
                    const isAtOrAboveATH = progressPct !== null && progressPct >= 99.5;
                    
                    return (
                        <div className="flex w-[160px] flex-col gap-1 items-end">
                            <span className="tabular-nums font-medium text-green-600 dark:text-green-400">
                                {formatMcap(row.original.ath_mcap)}
                            </span>
                            {progressPct !== null && (
                                <div className="flex flex-col gap-0.5">
                                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        {/* Glow underlay */}
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full"
                                            style={{ 
                                                width: `${progressPct}%`,
                                                background: 'linear-gradient(to right, rgb(239, 68, 68) 0%, rgb(251, 146, 60) 25%, rgb(250, 204, 21) 50%, rgb(163, 230, 53) 75%, rgb(34, 197, 94) 100%)',
                                                filter: 'blur(6px)',
                                                opacity: 0.35,
                                                transition: 'width 500ms ease-in-out'
                                            }}
                                        />
                                        {/* Foreground progress bar */}
                                        <div
                                            className="relative h-full rounded-full"
                                            style={{ 
                                                width: `${progressPct}%`,
                                                background: 'linear-gradient(to right, rgb(239, 68, 68) 0%, rgb(251, 146, 60) 25%, rgb(250, 204, 21) 50%, rgb(163, 230, 53) 75%, rgb(34, 197, 94) 100%)',
                                                transition: 'width 500ms ease-in-out'
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                        {isAtOrAboveATH ? "At ATH" : `${progressPct?.toFixed(0)}% of ATH`}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: "post_count",
header: () => <div className="w-[90px] text-center">Posts</div>,
                cell: ({ row }) => {
                    const count = toNumber(row.original.post_count) ?? 0;

                    // Percentile-based labeling with small-sample fallback
                    let tier: string;
                    let tierColor: string;

                    if (count === 0) {
                        tier = "None";
                        tierColor = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                    } else if (postTiers.sampleSize < 20) {
                        // Absolute buckets for small datasets
                        if (count === 1) {
                            tier = "Single";
                            tierColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
                        } else if (count <= 3) {
                            tier = "Few";
                            tierColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                        } else if (count <= 7) {
                            tier = "Some";
                            tierColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                        } else {
                            tier = "Many";
                            tierColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                        }
                    } else {
                        // Percentile mapping
                        if (count >= postTiers.p90) {
                            tier = "Top 10%";
                            tierColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                        } else if (count >= postTiers.p75) {
                            tier = "Top 25%";
                            tierColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                        } else if (count < postTiers.p15) {
                            tier = "Bottom 15%";
                            tierColor = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                        } else {
                            tier = "Mid 50%";
                            tierColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
                        }
                    }

                    return (
                        <div className="flex w-[90px] flex-col items-center gap-1 min-w-[60px]">
                            <Badge 
                                variant="secondary" 
                                className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5",
                                    tierColor
                                )}
                            >
                                {tier}
                            </Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {formatNumber(count)}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: "last_updated",
header: () => <div className="w-[150px] text-right">Last Updated</div>,
                cell: ({ row }) => (
                    <div className="w-[150px] text-right">
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDate(row.original.last_updated ?? row.original.updatedAt)}
                        </span>
                    </div>
                ),
            },
            {
                id: "actions",
                header: () => <div className="w-[56px]"></div>,
                cell: ({ row }) => (
                    <div className="w-[56px] flex justify-center">
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
                    </div>
                ),
            },
        ];
    }, [handleViewDetails, postTiers]);

    // Calculate percentiles for group monthly total posts (for percentile-based chips)
    const groupMonthlyPostTiers = useMemo(() => {
        const totals = liveGroupMonthly
            .map(group => {
                const tokens = group.tokens as Array<{ post_count?: number }> | undefined;
                return Array.isArray(tokens)
                    ? tokens.reduce((sum, t) => sum + (toNumber(t.post_count) || 0), 0)
                    : 0;
            })
            .filter(n => n > 0)
            .sort((a, b) => a - b);

        const getPct = (p: number) => totals.length ? (totals[Math.floor(totals.length * p)] || 0) : 0;

        return {
            p10: getPct(0.10),
            p15: getPct(0.15),
            p25: getPct(0.25),
            p50: getPct(0.50),
            p75: getPct(0.75),
            p90: getPct(0.90),
            sampleSize: totals.length,
        };
    }, [liveGroupMonthly]);

    const userColumns = useMemo<ColumnDef<GenericRecord, unknown>[]>(() => {
        return [
            {
                id: "user",
header: () => <div className="w-[180px] text-left">User</div>,
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
                        <div className="flex w-[180px] flex-col">
                            <span className="font-medium">{firstName}</span>
                            <span className="text-xs text-muted-foreground">@{username}</span>
                        </div>
                    );
                },
                filterFn: "includesString",
            },
            {
                accessorKey: "user_id",
header: () => <div className="w-[140px] text-left">User ID</div>,
                cell: ({ row }) => (
                    <div className="w-[140px] text-left">
                        <span className="font-mono text-xs">
                        {typeof row.original.user_id === "string"
                            ? row.original.user_id
                            : "—"}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "is_active",
header: () => <div className="w-[100px] text-center">Status</div>,
                cell: ({ row }) => {
                    const isActive = row.original.is_active === true;
                    const statusColor = isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                    
                    return (
                        <div className="w-[100px] flex justify-center">
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 w-fit",
                                    statusColor
                                )}
                            >
                                {isActive ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                    );
                },
            },
            {
                accessorKey: "joined_at",
header: () => <div className="w-[150px] text-right">Joined</div>,
                cell: ({ row }) => (
                    <div className="w-[150px] text-right">
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDate(row.original.joined_at)}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "updatedAt",
                header: () => <div className="w-[150px] text-right">Last Updated</div>,
                cell: ({ row }) => (
                    <div className="w-[150px] text-right">
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDate(row.original.updatedAt)}
                        </span>
                    </div>
                ),
            },
            {
                id: "actions",
                header: () => <div className="w-[56px]"></div>,
                cell: ({ row }) => (
                    <div className="w-[56px] flex justify-center">
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
                    </div>
                ),
            },
        ];
    }, [handleViewDetails]);

    const groupMonthlyColumns = useMemo<ColumnDef<GenericRecord, unknown>[]>(() => {
        return [
            {
                accessorKey: "group_id",
                header: () => <div className="w-[140px] text-left">Group ID</div>,
                cell: ({ row }) => (
                    <div className="w-[140px] text-left">
                        <span className="font-mono text-xs">
                        {typeof row.original.group_id === "string"
                            ? row.original.group_id
                            : "—"}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "month",
                header: () => <div className="w-[120px] text-left">Month</div>,
                cell: ({ row }) => (
                    <div className="w-[120px] text-left">
                        <span className="font-medium">
                            {typeof row.original.month === "string" ? row.original.month : "—"}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "token_count",
                header: () => <div className="w-[110px] text-center">Token Count</div>,
                cell: ({ row }) => {
                    const tokens = row.original.tokens as Array<{ post_count?: number }> | undefined;
                    const count = Array.isArray(tokens) ? tokens.length : 0;
                    
                    // Calculate diversity: Herfindahl-Hirschman Index (HHI) concentration
                    let diversity: string;
                    let diversityColor: string;
                    
                    if (count === 0) {
                        diversity = "None";
                        diversityColor = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                    } else if (count === 1) {
                        diversity = "Single";
                        diversityColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
                    } else {
                        const postCounts = tokens?.map(t => toNumber(t.post_count) || 0) || [];
                        const totalPosts = postCounts.reduce((sum, c) => sum + c, 0);
                        
                        if (totalPosts === 0) {
                            diversity = "Balanced";
                            diversityColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                        } else {
                            // Calculate HHI: sum of squared market shares (0-1 scale)
                            const hhi = postCounts.reduce((sum, c) => {
                                const share = c / totalPosts;
                                return sum + (share * share);
                            }, 0);
                            
                            // HHI interpretation:
                            // < 0.15: Balanced (many tokens with similar activity)
                            // 0.15-0.25: Mixed (moderate concentration)
                            // > 0.25: Concentrated (few tokens dominate)
                            if (hhi < 0.15) {
                                diversity = "Balanced";
                                diversityColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                            } else if (hhi < 0.25) {
                                diversity = "Mixed";
                                diversityColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
                            } else {
                                diversity = "Focused";
                                diversityColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                            }
                        }
                    }
                    
                    return (
                        <div className="flex w-[110px] flex-col items-center gap-1">
                            <Badge 
                                variant="secondary" 
                                className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5",
                                    diversityColor
                                )}
                            >
                                {diversity}
                            </Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {formatNumber(count)}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: "total_posts",
                header: () => <div className="w-[100px] text-center">Total Posts</div>,
                cell: ({ row }) => {
                    const tokens = row.original.tokens as Array<{ post_count?: number }> | undefined;
                    const total = Array.isArray(tokens)
                        ? tokens.reduce((sum, t) => sum + (toNumber(t.post_count) || 0), 0)
                        : 0;

                    let tier: string;
                    let tierColor: string;

                    if (total === 0) {
                        tier = "None";
                        tierColor = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                    } else if (groupMonthlyPostTiers.sampleSize < 20) {
                        if (total === 1) {
                            tier = "Single";
                            tierColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
                        } else if (total <= 3) {
                            tier = "Few";
                            tierColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                        } else if (total <= 7) {
                            tier = "Some";
                            tierColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                        } else {
                            tier = "Many";
                            tierColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                        }
                    } else {
                        if (total >= groupMonthlyPostTiers.p90) {
                            tier = "Top 10%";
                            tierColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                        } else if (total >= groupMonthlyPostTiers.p75) {
                            tier = "Top 25%";
                            tierColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                        } else if (total < groupMonthlyPostTiers.p15) {
                            tier = "Bottom 15%";
                            tierColor = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                        } else {
                            tier = "Mid 50%";
                            tierColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
                        }
                    }

                    return (
                        <div className="flex w-[100px] flex-col items-center gap-1">
                            <Badge 
                                variant="secondary" 
                                className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5",
                                    tierColor
                                )}
                            >
                                {tier}
                            </Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {formatNumber(total)}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: "updatedAt",
                header: () => <div className="w-[150px] text-right">Last Updated</div>,
                cell: ({ row }) => (
                    <div className="w-[150px] text-right">
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDate(row.original.updatedAt ?? row.original.last_updated)}
                        </span>
                    </div>
                ),
            },
            {
                id: "actions",
                header: () => <div className="w-[56px]"></div>,
                cell: ({ row }) => (
                    <div className="w-[56px] flex justify-center">
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
                    </div>
                ),
            },
        ];
    }, [handleViewDetails, groupMonthlyPostTiers]);

    const tabIndex = Math.max(TAB_ORDER.indexOf(activeTab), 0);

    return (
        <>
            <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as TabKey)}
                className="w-full"
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className={`text-sm font-semibold ${pressStart.className}`}>Explore Data</h2>
                    <TabsList className="relative flex w-full max-w-md gap-2 -mb-[10px] lg:ml-auto">
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
                                className="relative z-10 flex-1 border-transparent px-2 py-2 text-xs sm:px-4 sm:text-sm font-medium text-muted-foreground transition-colors duration-300 delay-100 data-[state=active]:text-foreground"
                            >
                                Token Calls
                            </TabsTrigger>
                            <TabsTrigger
                                value="users"
                                className="relative z-10 flex-1 border-transparent px-2 py-2 text-xs sm:px-4 sm:text-sm font-medium text-muted-foreground transition-colors duration-300 delay-100 data-[state=active]:text-foreground"
                            >
                                Users
                            </TabsTrigger>
                            <TabsTrigger
                                value="group-monthly"
                                className="relative z-10 flex-1 border-transparent px-2 py-2 text-xs sm:px-4 sm:text-sm font-medium text-muted-foreground transition-colors duration-300 delay-100 data-[state=active]:text-foreground"
                            >
                                Group Monthly
                            </TabsTrigger>
                        </TabsList>
                </div>

                <TabsContent value="token-calls" className="mt-0">
                    <div className="rounded-b-lg border border-border bg-card">
                        <div className="flex flex-col gap-3 border-b bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div>
                                <h3 className={`text-sm font-semibold ${pressStart.className}`}>Token Calls</h3>
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
                                <h3 className={`text-sm font-semibold ${pressStart.className}`}>Users</h3>
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
                                <h3 className={`text-sm font-semibold ${pressStart.className}`}>Group Monthly Tokens</h3>
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

            {/* Scrub overlay (fixed, outside table to avoid clipping) */}
            {scrubOverlay && (
                <div
                    className="fixed z-[100] w-[300px] -translate-x-1/2 bg-card border border-border rounded-lg p-3 shadow-xl"
                    style={{ left: scrubOverlay.left, top: scrubOverlay.top }}
                    onMouseLeave={() => { setActiveScrubRow(null); setScrubOverlay(null); }}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium">Compare Range</span>
                        <button 
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => { setActiveScrubRow(null); setScrubOverlay(null); }}
                        >
                            ×
                        </button>
                    </div>
                    <div className="space-y-3">
                        {/* Custom multicolor interactive progress bar */}
                        {(() => {
                            const { first, ath } = scrubOverlay;
                            const current = first + (ath - first) * (scrubVisual / 100);
                            const xToAth = current > 0 ? (ath / current) : 1;
                            const scrubProgress = Math.max(0, Math.min(100, scrubVisual));
                            const firstMarkerLeft = Math.max(0, Math.min(100, (first / ath) * 100));
                            
                            const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
                                if ((e.target as HTMLElement).classList.contains('scrub-thumb')) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                                setScrubValue(percentage);
                                setJustClicked(true);
                                if (clickDelayRef.current) clearTimeout(clickDelayRef.current);
                                clickDelayRef.current = window.setTimeout(() => {
                                    setScrubVisual(percentage);
                                    setJustClicked(false);
                                    clickDelayRef.current = null;
                                }, 180);
                            };
                            
                            const handleThumbMouseDown = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (clickDelayRef.current) { clearTimeout(clickDelayRef.current); clickDelayRef.current = null; }
                                setIsDragging(true);
                                setJustClicked(false);
                                
                                const trackRect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                                
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                    const moveX = moveEvent.clientX - trackRect.left;
                                    const percentage = Math.max(0, Math.min(100, (moveX / trackRect.width) * 100));
                                    setScrubValue(percentage);
                                    setScrubVisual(percentage);
                                };
                                
                                const handleMouseUp = () => {
                                    setIsDragging(false);
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                };
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                            };
                            
                            return (
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                        <span>Projection</span>
                                        <span className="font-semibold text-blue-600 dark:text-blue-400">{xToAth.toFixed(1)}× to ATH</span>
                                    </div>
                                    {/* Custom interactive track */}
                                    <div 
                                        className="relative h-2 w-full rounded-full bg-muted cursor-pointer select-none"
                                        onClick={handleTrackClick}
                                    >
                                        {/* Background muted layer */}
                                        <div className="absolute inset-0 bg-muted/40 rounded-full z-0" />
                                        
                                        {/* Multicolor gradient fill */}
                                        <div
                                            className="absolute h-full rounded-full z-10"
                                            style={{
                                                width: `${scrubProgress}%`,
                                                background: 'linear-gradient(to right, rgb(234 179 8), rgb(59 130 246), rgb(147 51 234))',
                                                transitionProperty: 'width',
                                                transitionDuration: isDragging ? '40ms' : '280ms',
                                                transitionTimingFunction: isDragging ? 'linear' : 'cubic-bezier(.22,.61,.36,1)',
                                                transitionDelay: (!isDragging && justClicked) ? '120ms' : '0ms',
                                                willChange: 'width'
                                            }}
                                        />
                                        
                                        {/* First Called marker */}
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-400 rounded-full shadow-lg z-20 pointer-events-none"
                                            style={{ left: `${firstMarkerLeft}%`, boxShadow: '0 0 8px rgba(250, 204, 21, 0.7)' }}
                                        />
                                        
                                        {/* ATH marker */}
                                        <div
                                            className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-4 bg-green-500 rounded-full shadow-lg z-20 pointer-events-none"
                                            style={{ boxShadow: '0 0 8px rgba(34, 197, 94, 0.7)' }}
                                        />
                                        
                                        {/* Draggable thumb */}
                                        <div
                                            className="scrub-thumb absolute w-5 h-5 rounded-full border-2 border-white shadow-lg z-30 cursor-grab active:cursor-grabbing"
                                            style={{
                                                left: `${scrubProgress}%`,
                                                top: '50%',
                                                background: 'linear-gradient(to bottom right, rgb(255 255 255), rgb(229 231 235))',
                                                transform: `translate(-50%, -50%) scale(${isDragging ? 1.15 : 1})`,
                                                transitionProperty: isDragging ? 'transform, box-shadow' : 'left, transform, box-shadow',
                                                transitionDuration: isDragging ? '100ms, 100ms' : '280ms, 100ms, 100ms',
                                                transitionTimingFunction: isDragging ? 'ease, ease' : 'cubic-bezier(.22,.61,.36,1), ease, ease',
                                                transitionDelay: isDragging ? '0ms, 0ms' : `${justClicked ? '120ms' : '0ms'}, 0ms, 0ms`,
                                                boxShadow: isDragging 
                                                    ? '0 4px 12px rgba(0,0,0,0.3), 0 0 0 3px rgba(59,130,246,0.3)' 
                                                    : '0 2px 8px rgba(0,0,0,0.2)'
                                            }}
                                            onMouseDown={handleThumbMouseDown}
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                        {(() => {
                            const { first, ath } = scrubOverlay;
                        const current = first + (ath - first) * (scrubVisual / 100);
                        const liftNeeded = current > 0 ? ((ath / current - 1) * 100) : 0;
                        const fromFirst = first > 0 ? ((current / first - 1) * 100) : 0;
                            return (
                                <>
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>First: {formatMcap(first)}</span>
                                        <span>Current: {formatMcap(current)}</span>
                                        <span>ATH: {formatMcap(ath)}</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-3 text-[11px]">
                                        <span>Lift needed: <span className="font-semibold text-green-600 dark:text-green-400" style={{ textShadow: '0 0 6px rgba(34,197,94,0.28)' }}>{liftNeeded.toFixed(1)}%</span></span>
                                        <span className="h-3 w-px bg-border/70" />
                                        <span>From First: <span className="font-semibold text-blue-600 dark:text-blue-400" style={{ textShadow: '0 0 6px rgba(59,130,246,0.28)' }}>{fromFirst.toFixed(1)}%</span></span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className="sm:max-w-2xl max-h-screen flex flex-col">
                    <SheetHeader>
                        <SheetTitle>{selected?.title ?? "Details"}</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 p-4 pt-2 overflow-hidden flex flex-col">
                        <div className="sticky top-0 flex justify-end gap-2 pb-3 z-10">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(jsonString)}
                                disabled={!jsonString}
                                className="h-7 gap-2 px-2"
                                aria-label={copied ? "Copied entire JSON" : "Copy entire JSON"}
                            >
                                {copied ? (
                                    <>
                                        <CheckIcon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline text-xs">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <CopyIcon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline text-xs">Copy All</span>
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {selected && (
                                <JsonTreeViewer
                                    data={selected.data}
                                    onCopy={handleJsonValueCopy}
                                />
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
