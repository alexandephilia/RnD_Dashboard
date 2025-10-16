"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];

interface JsonTreeViewerProps {
    data: unknown;
    onCopy?: (value: string) => void;
}

interface NodeProps {
    nodeKey?: string;
    value: JSONValue;
    level: number;
    onCopy?: (value: string) => void;
    isRoot?: boolean;
    path: string;
    hoveredPath: string | null;
    onHover: (path: string | null) => void;
}

const isObject = (value: unknown): value is JSONObject =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const isArray = (value: unknown): value is JSONArray => Array.isArray(value);

// Check if currentPath is a DIRECT child of hoveredPath (one level down only)
const isDirectChild = (hoveredPath: string | null, currentPath: string): boolean => {
    if (!hoveredPath) return false;
    if (currentPath === hoveredPath) return false;
    
    // Remove the hovered path prefix
    if (!currentPath.startsWith(hoveredPath)) return false;
    
    const remainder = currentPath.slice(hoveredPath.length);
    // Direct child should start with . or [ and have no additional . or [ after that
    if (remainder.startsWith('.')) {
        const afterDot = remainder.slice(1);
        return !afterDot.includes('.') && !afterDot.includes('[');
    }
    if (remainder.startsWith('[')) {
        const closeBracket = remainder.indexOf(']');
        if (closeBracket === -1) return false;
        const afterBracket = remainder.slice(closeBracket + 1);
        return afterBracket === '' || (!afterBracket.includes('.') && !afterBracket.includes('['));
    }
    return false;
};

// Check if currentPath is the DIRECT parent of hoveredPath (one level up)
const isDirectParent = (hoveredPath: string | null, currentPath: string): boolean => {
    if (!hoveredPath) return false;
    if (currentPath === hoveredPath) return false;
    return isDirectChild(currentPath, hoveredPath);
};

const JsonValue = ({
    value,
    onCopy,
    path,
    isHovered,
    onHover,
}: {
    value: JSONValue;
    onCopy?: (value: string) => void;
    path: string;
    isHovered: boolean;
    onHover: (path: string | null) => void;
}) => {
    if (value === null) {
        return (
            <span
                className={cn(
                    "text-amber-600 dark:text-amber-500 font-medium transition-all",
                    isHovered && "filter drop-shadow-[0_0_0.45rem_rgba(245,158,11,0.55)] brightness-125"
                )}
                onMouseEnter={() => onHover(path)}
            >
                null
            </span>
        );
    }

    if (typeof value === "boolean") {
        return (
            <span
                className={cn(
                    "text-blue-600 dark:text-blue-400 font-medium transition-all",
                    isHovered && "filter drop-shadow-[0_0_0.45rem_rgba(59,130,246,0.55)] brightness-125"
                )}
                onMouseEnter={() => onHover(path)}
            >
                {String(value)}
            </span>
        );
    }

    if (typeof value === "number") {
        return (
            <span
                className={cn(
                    "text-emerald-600 dark:text-emerald-400 font-medium transition-all",
                    isHovered && "filter drop-shadow-[0_0_0.45rem_rgba(16,185,129,0.55)] brightness-125"
                )}
                onMouseEnter={() => onHover(path)}
            >
                {value}
            </span>
        );
    }

    if (typeof value === "string") {
        return (
            <div
                className={cn(
                    "flex items-center gap-2 group transition-all"
                )}
                onMouseEnter={() => onHover(path)}
            >
                <span
                    className={cn(
                        "text-orange-600 dark:text-orange-400 transition",
                        isHovered && "filter drop-shadow-[0_0_0.55rem_rgba(249,115,22,0.65)] brightness-125"
                    )}
                >
                    &quot;{value}&quot;
                </span>
                {onCopy && (
                    <button
                        onClick={() => onCopy(`"${value}"`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
                        title="Copy value"
                    >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                )}
            </div>
        );
    }

    return null;
};

const TreeNode = ({
    nodeKey,
    value,
    level,
    onCopy,
    isRoot = false,
    path,
    hoveredPath,
    onHover,
}: NodeProps) => {
    const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
    const isHovered = hoveredPath === path;
    const isMyDirectChild = isDirectChild(hoveredPath, path);
    const isMyDirectParent = isDirectParent(hoveredPath, path);
    const isRelated = isHovered || isMyDirectChild || isMyDirectParent;

    if (!isObject(value) && !isArray(value)) {
        return (
            <div
                className={cn(
                    "flex items-center gap-2 transition-all"
                )}
                onMouseEnter={() => onHover(path)}
            >
                {nodeKey && (
                    <>
                        <span className={cn(
                            "text-yellow-600 dark:text-yellow-400 font-medium transition-all",
                            (isHovered || isMyDirectParent || isMyDirectChild) && "filter drop-shadow-[0_0_0.55rem_rgba(234,179,8,0.65)] brightness-125"
                        )}>
                            {nodeKey}
                        </span>
                        <span className="text-muted-foreground">:</span>
                    </>
                )}
                <JsonValue
                    value={value}
                    onCopy={onCopy}
                    path={path}
                    isHovered={isHovered || isMyDirectParent || isMyDirectChild}
                    onHover={onHover}
                />
            </div>
        );
    }

    const isArr = isArray(value);
    const entries = isArr
        ? (value as JSONArray).map((v, i) => [String(i), v] as const)
        : Object.entries(value as JSONObject);

    const openBracket = isArr ? "[" : "{";
    const closeBracket = isArr ? "]" : "}";
    const isEmpty = entries.length === 0;

    return (
        <div
            className={cn(
                "font-mono text-xs leading-relaxed transition-all"
            )}
            onMouseEnter={() => onHover(path)}
        >
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "flex items-center justify-center w-4 h-4 p-0 hover:bg-muted rounded transition-colors",
                        isEmpty && "invisible"
                    )}
                    title={isExpanded ? "Collapse" : "Expand"}
                >
                    <ChevronRight
                        className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            (isHovered || isMyDirectChild) && "text-yellow-600 dark:text-yellow-400 filter drop-shadow-[0_0_0.35rem_rgba(234,179,8,0.5)] brightness-125",
                            !isRelated && "text-muted-foreground",
                            isExpanded && "rotate-90"
                        )}
                    />
                </button>

                <div className="flex items-center gap-1">
                    {nodeKey && !isRoot && (
                        <>
                            <span className={cn(
                                "text-yellow-600 dark:text-yellow-400 font-medium transition-all",
                                (isHovered || isMyDirectChild) && "filter drop-shadow-[0_0_0.55rem_rgba(234,179,8,0.65)] brightness-125"
                            )}>
                                {nodeKey}
                            </span>
                            <span className="text-muted-foreground">:</span>
                        </>
                    )}

                    <span className={cn(
                        "text-muted-foreground font-bold transition-all",
                        (isHovered || isMyDirectChild) && "text-yellow-600 dark:text-yellow-400 filter drop-shadow-[0_0_0.55rem_rgba(234,179,8,0.65)] brightness-125"
                    )}>
                        {openBracket}
                    </span>

                    {!isEmpty && !isExpanded && (
                        <span className="text-muted-foreground text-[10px] italic ml-1">
                            {entries.length} {isArr ? "items" : "keys"}
                        </span>
                    )}

                    {isEmpty && (
                        <span className={cn(
                            "text-muted-foreground font-bold transition-all",
                            (isHovered || isMyDirectChild) && "text-yellow-600 dark:text-yellow-400 filter drop-shadow-[0_0_0.55rem_rgba(234,179,8,0.65)] brightness-125"
                        )}>
                            {closeBracket}
                        </span>
                    )}
                </div>
            </div>

            {isExpanded && !isEmpty && (
                <div className={cn(
                    "ml-4 border-l pl-3 py-1 transition-all",
                    isRelated && "border-yellow-500/50",
                    !isRelated && "border-border/50"
                )}>
                    {entries.map(([key, val]) => {
                        const childPath = isArr ? `${path}[${key}]` : `${path}.${key}`;
                        return (
                            <div key={key} className="py-0.5">
                                <TreeNode
                                    nodeKey={key}
                                    value={val as JSONValue}
                                    level={level + 1}
                                    onCopy={onCopy}
                                    path={childPath}
                                    hoveredPath={hoveredPath}
                                    onHover={onHover}
                                />
                            </div>
                        );
                    })}

                    <div className="flex items-center gap-1">
                        <div className="w-4" />
                        <span className={cn(
                            "text-muted-foreground font-bold transition-all",
                            (isHovered || isMyDirectChild) && "text-yellow-600 dark:text-yellow-400 filter drop-shadow-[0_0_0.55rem_rgba(234,179,8,0.65)] brightness-125"
                        )}>
                            {closeBracket}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export function JsonTreeViewer({ data, onCopy }: JsonTreeViewerProps) {
    const [hoveredPath, setHoveredPath] = useState<string | null>(null);
    const [displayedPath, setDisplayedPath] = useState<string | null>(null);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (hoveredPath) {
            setDisplayedPath(hoveredPath);
            setIsExiting(false);
        } else if (displayedPath) {
            setIsExiting(true);
            const timer = setTimeout(() => {
                setDisplayedPath(null);
                setIsExiting(false);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [hoveredPath, displayedPath]);
    
    const jsonValue = useMemo(() => {
        if (!isObject(data) && !isArray(data)) {
            return data as JSONValue;
        }
        return data as JSONValue;
    }, [data]);

    if (jsonValue === undefined) {
        return (
            <div className="text-muted-foreground text-xs italic p-4">
                No data to display
            </div>
        );
    }

    return (
        <div className="relative flex flex-col">
            <div
                className="relative bg-card border border-border rounded-lg p-4 overflow-auto max-h-[70vh] break-words select-none cursor-default"
                onMouseLeave={() => setHoveredPath(null)}
            >
                <TreeNode
                    value={jsonValue}
                    level={0}
                    onCopy={onCopy}
                    isRoot={true}
                    path="root"
                    hoveredPath={hoveredPath}
                    onHover={setHoveredPath}
                />
                {displayedPath && (
                    <div className="sticky bottom-0 z-10 w-full pointer-events-none">
                        <div className="flex justify-end pr-3 pb-3">
                            <div className={cn(
                                "pointer-events-auto max-w-[300px] px-1.5 py-1 rounded bg-orange-50/80 dark:bg-orange-900/40 text-orange-950 dark:text-orange-50 text-[10px] border-2 border-orange-200/10 dark:border-orange-700/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),inset_0_-1px_1px_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.1)] transition-all duration-200",
                                !isExiting && "animate-in fade-in slide-in-from-bottom-1 duration-200",
                                isExiting && "animate-out fade-out slide-out-to-bottom-1 duration-150"
                            )}>
                                <span className="mr-1.5 text-[8px] uppercase text-orange-700 dark:text-orange-300 font-medium">Path</span>
                                <span className="font-mono break-all">{displayedPath}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
