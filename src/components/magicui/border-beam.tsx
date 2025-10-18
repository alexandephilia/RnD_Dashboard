"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useMotionValue, type MotionProps, type MotionStyle } from "motion/react";

function parseRadius(value: string | null | undefined): number {
    if (!value) return 0;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildRoundedRectPath(width: number, height: number, radius: number) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    return [
        `M ${r} 0`,
        `H ${width - r}`,
        `Q ${width} 0 ${width} ${r}`,
        `V ${height - r}`,
        `Q ${width} ${height} ${width - r} ${height}`,
        `H ${r}`,
        `Q 0 ${height} 0 ${height - r}`,
        `V ${r}`,
        `Q 0 0 ${r} 0`,
        "Z",
    ].join(" ");
}

export interface BorderBeamProps extends MotionProps {
    className?: string;
    size?: number;
    duration?: number;
    delay?: number;
    colorFrom?: string;
    colorTo?: string;
    reverse?: boolean;
    initialOffset?: number;
    borderRadius?: number;
    borderWidth?: number;
    inset?: number | string;
}

export function BorderBeam({
    className,
    size = 120,
    delay = 0,
    duration = 6,
    colorFrom = "#ffaa40",
    colorTo = "#9c40ff",
    reverse = false,
    initialOffset = 0,
    borderRadius,
    borderWidth = 1,
    inset = -1,
    style: inlineStyle,
    transition,
    animate,
    initial,
    ...rest
}: BorderBeamProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [path, setPath] = useState<string | null>(null);
    const prevMetricsRef = useRef<{ width: number; height: number; radius: number; path: string } | null>(null);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const updatePath = () => {
            const rect = el.getBoundingClientRect();
            if (!rect.width || !rect.height) {
                prevMetricsRef.current = null;
                setPath(null);
                return;
            }

            const computedStyle = getComputedStyle(el);
            const topRadius = borderRadius ?? parseRadius(computedStyle.borderTopLeftRadius);
            const generatedPath = buildRoundedRectPath(rect.width, rect.height, topRadius);
            const prev = prevMetricsRef.current;
            const hasChanged =
                !prev ||
                Math.abs(prev.width - rect.width) > 0.5||
                Math.abs(prev.height - rect.height) > 0.5 ||
                Math.abs(prev.radius - topRadius) > 0.5 ||
                prev.path !== generatedPath;

            if (hasChanged) {
                prevMetricsRef.current = {
                    width: rect.width,
                    height: rect.height,
                    radius: topRadius,
                    path: generatedPath,
                };
                setPath(generatedPath);
            }
        };

        updatePath();

        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const resizeObserver = new ResizeObserver(updatePath);
        resizeObserver.observe(el);

        return () => {
            resizeObserver.disconnect();
        };
    }, [borderRadius]);

    const normalizedOffset = ((initialOffset % 100) + 100) % 100;
    const hasExternalMotion = Boolean(initial || animate || transition);
    const offsetMotion = useMotionValue(`${normalizedOffset}%`);

    useEffect(() => {
        if (hasExternalMotion) return;
        let frameId: number;
        const durationMs = Math.max(0.001, duration) * 1000;
        const delayMs = Math.max(0, delay ?? 0) * 1000;
        const direction = reverse ? -1 : 1;
        let startTime: number | null = null;

        const step = (time: number) => {
            if (startTime === null) startTime = time;
            const elapsed = time - startTime;

            if (elapsed < delayMs) {
                offsetMotion.set(`${normalizedOffset}%`);
            } else {
                const travelled = ((elapsed - delayMs) / durationMs) * 100 * direction;
                const value = normalizedOffset + travelled;
                const wrapped = ((value % 100) + 100) % 100;
                offsetMotion.set(`${wrapped}%`);
            }

            frameId = requestAnimationFrame(step);
        };

        frameId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frameId);
    }, [hasExternalMotion, offsetMotion, normalizedOffset, reverse, duration, delay]);

    const insetValue = typeof inset === "number" ? `${inset}px` : inset;

    return (
        <div
            ref={wrapperRef}
            className="pointer-events-none absolute rounded-[inherit] border border-transparent [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] [mask-composite:intersect] [mask-clip:padding-box,border-box]"
            style={{ borderWidth, inset: insetValue } as CSSProperties}
        >
            <motion.div
                {...rest}
                className={cn(
                    "absolute aspect-square",
                    "bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent",
                    className,
                )}
                style={
                    {
                        width: size,
                        height: size,
                        offsetPath: path ? `path('${path}')` : undefined,
                        "--color-from": colorFrom,
                        "--color-to": colorTo,
                        ...inlineStyle,
                        offsetDistance: hasExternalMotion
                            ? inlineStyle?.offsetDistance ?? undefined
                            : offsetMotion,
                    } as MotionStyle
                }
                initial={hasExternalMotion ? initial : false}
                animate={hasExternalMotion ? animate : undefined}
                transition={hasExternalMotion ? transition : undefined}
            />
        </div>
    );
}
