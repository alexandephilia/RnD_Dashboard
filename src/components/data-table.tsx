"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
    RiArrowDownSLine,
    RiArrowUpSLine,
    RiCloseCircleLine,
    RiSearch2Line,
} from "@remixicon/react";
import {
    ColumnDef,
    ColumnFiltersState,
    PaginationState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface DataTableProps<TData> {
    data: TData[];
    columns: ColumnDef<TData, unknown>[];
    searchColumn?: string;
    searchPlaceholder?: string;
    defaultPageSize?: number;
    emptyMessage?: string;
}

export function DataTable<TData>({
    data,
    columns,
    searchColumn,
    searchPlaceholder = "Search...",
    defaultPageSize = 10,
    emptyMessage = "No data available.",
}: DataTableProps<TData>) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: defaultPageSize,
    });
    const [scrollState, setScrollState] = useState({
        isScrolledLeft: false,
        isScrolledRight: false,
        canScrollHorizontally: false,
    });

    const showLeftFade = scrollState.canScrollHorizontally && scrollState.isScrolledLeft;
    const showRightFade = scrollState.canScrollHorizontally && scrollState.isScrolledRight;
    const leftFadeStyle: CSSProperties = {
        backgroundImage:
            "linear-gradient(to right, var(--color-card) 0%, var(--color-card) 20%, transparent 90%)",
    };
    const rightFadeStyle: CSSProperties = {
        backgroundImage:
            "linear-gradient(to left, var(--color-card) 0%, var(--color-card) 20%, transparent 90%)",
    };

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        enableSortingRemoval: false,
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            pagination,
            columnFilters,
        },
    });

    const updateScrollIndicators = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const maxScrollLeft = Math.max(scrollWidth - clientWidth, 0);
        const epsilon = 2;

        const nextState = {
            canScrollHorizontally: scrollWidth > clientWidth + epsilon,
            isScrolledLeft: scrollLeft > epsilon,
            isScrolledRight: scrollLeft < maxScrollLeft - epsilon,
        };

        setScrollState((prev) => {
            if (
                prev.canScrollHorizontally === nextState.canScrollHorizontally &&
                prev.isScrolledLeft === nextState.isScrolledLeft &&
                prev.isScrolledRight === nextState.isScrolledRight
            ) {
                return prev;
            }
            return nextState;
        });
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let frame = 0;
        const handleScroll = () => {
            if (frame) {
                cancelAnimationFrame(frame);
            }
            frame = requestAnimationFrame(() => {
                frame = 0;
                updateScrollIndicators();
            });
        };

        handleScroll();
        container.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", updateScrollIndicators);

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => updateScrollIndicators());
            resizeObserver.observe(container);
        }

        return () => {
            container.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", updateScrollIndicators);
            if (frame) {
                cancelAnimationFrame(frame);
            }
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, [updateScrollIndicators]);

    const totalRows = table.getFilteredRowModel().rows.length;
    const { pageIndex, pageSize } = table.getState().pagination;

    const paginationRange = useMemo(() => {
        if (totalRows === 0) {
            return { start: 0, end: 0 };
        }
        const start = Math.min(pageIndex * pageSize + 1, totalRows);
        const end = Math.min((pageIndex + 1) * pageSize, totalRows);
        return { start, end };
    }, [pageIndex, pageSize, totalRows]);

    const hasRows = table.getRowModel().rows.length > 0;

    return (
        <div className="space-y-4">
            {searchColumn && (
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Input
                            id={`${id}-search`}
                            ref={inputRef}
                            className={cn(
                                "ps-9 bg-background",
                                Boolean(table.getColumn(searchColumn)?.getFilterValue()) && "pe-9",
                            )}
                            value={
                                (table.getColumn(searchColumn)?.getFilterValue() ?? "") as string
                            }
                            onChange={(e) =>
                                table.getColumn(searchColumn)?.setFilterValue(e.target.value)
                            }
                            placeholder={searchPlaceholder}
                            type="text"
                            aria-label="Search"
                        />
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/60">
                            <RiSearch2Line
                                size={20}
                                aria-hidden="true"
                                suppressHydrationWarning
                            />
                        </div>
                        {Boolean(table.getColumn(searchColumn)?.getFilterValue()) && (
                            <button
                                className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/60 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70"
                                aria-label="Clear search"
                                onClick={() => {
                                    table.getColumn(searchColumn)?.setFilterValue("");
                                    if (inputRef.current) {
                                        inputRef.current.focus();
                                    }
                                }}
                            >
                                <RiCloseCircleLine
                                    size={16}
                                    aria-hidden="true"
                                    suppressHydrationWarning
                                />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="rounded-lg border bg-card overflow-hidden">
                <div className="relative">
                    <div
                        ref={scrollContainerRef}
                        className="relative w-full overflow-x-auto overflow-y-visible"
                    >
                        <table className="min-w-[640px] w-full caption-bottom text-sm">
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className="bg-muted/40"
                                            >
                                                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "flex w-full items-center gap-2 text-left font-medium transition-colors",
                                                            "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                        )}
                                                        onClick={header.column.getToggleSortingHandler()}
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext(),
                                                        )}
                                                        {{
                                                            asc: (
                                                                <RiArrowUpSLine
                                                                    className="shrink-0"
                                                                    size={16}
                                                                    aria-hidden="true"
                                                                    suppressHydrationWarning
                                                                />
                                                            ),
                                                            desc: (
                                                                <RiArrowDownSLine
                                                                    className="shrink-0"
                                                                    size={16}
                                                                    aria-hidden="true"
                                                                    suppressHydrationWarning
                                                                />
                                                            ),
                                                        }[header.column.getIsSorted() as string] ?? null}
                                                    </button>
                                                ) : (
                                                    flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )
                                                )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {hasRows ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} className="hover:bg-muted/50">
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id} className="align-middle">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            {emptyMessage}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </table>
                    </div>
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-y-0 left-0 w-16 transition-opacity duration-300",
                            showLeftFade ? "opacity-100" : "opacity-0",
                        )}
                        style={leftFadeStyle}
                        aria-hidden="true"
                    />
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-y-0 right-0 w-16 transition-opacity duration-300",
                            showRightFade ? "opacity-100" : "opacity-0",
                        )}
                        style={rightFadeStyle}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {totalRows > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                        Showing {" "}
                        <span className="font-medium text-foreground">{paginationRange.start}</span>
                        {" "}-{" "}
                        <span className="font-medium text-foreground">{paginationRange.end}</span>
                        {" "}of{" "}
                        <span className="font-medium text-foreground">{totalRows}</span>
                        {" "}entries
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            aria-label="Go to previous page"
                        >
                            Previous
                        </Button>
                        <div className="flex items-center gap-1 text-sm">
                            <span className="text-muted-foreground">Page</span>
                            <span className="font-medium">
                                {table.getState().pagination.pageIndex + 1}
                            </span>
                            <span className="text-muted-foreground">of</span>
                            <span className="font-medium">{table.getPageCount()}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            aria-label="Go to next page"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
