"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { RiLogoutBoxLine, RiScanLine, RiSettings3Line } from "@remixicon/react";
import { Press_Start_2P } from "next/font/google";
import { useEffect, useRef, useState } from "react";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"] });

export function SidebarHoverTrigger() {
    const { open: mainSidebarOpen, setOpen, isMobile } = useSidebar();
    const [isVisible, setIsVisible] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const prevMainSidebarOpen = useRef(mainSidebarOpen);

    useEffect(() => {
        if (isMobile) {
            setIsVisible(false);
            return;
        }

        // Detect when main sidebar opens while hover sidebar is visible
        if (!prevMainSidebarOpen.current && mainSidebarOpen && isVisible) {
            // Start transformation - keep hover sidebar visible and morph it
            setIsTransforming(true);

            // Add class to body to trigger CSS rules
            document.body.classList.add('hover-sidebar-transforming');

            // Wait for transformation animation to complete
            setTimeout(() => {
                document.body.classList.remove('hover-sidebar-transforming');
                document.body.classList.add('hover-sidebar-transform-complete');

                // Keep floating sidebar visible until main sidebar content fade completes
                // Main sidebar content fades in over 300ms, so wait for that
                setTimeout(() => {
                    setIsVisible(false);
                    setIsTransforming(false);
                    document.body.classList.remove('hover-sidebar-transform-complete');
                }, 320); // 300ms fade + 20ms buffer
            }, 350);
        }

        prevMainSidebarOpen.current = mainSidebarOpen;

        if (mainSidebarOpen && !isTransforming) {
            setIsVisible(false);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            const triggerZone = 15;
            const isInTriggerZone = e.clientX <= triggerZone;

            if (isInTriggerZone && !isVisible && !mainSidebarOpen) {
                setIsVisible(true);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [isMobile, mainSidebarOpen, isVisible, isTransforming]);

    // Inject CSS for seamless transformation
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'hover-sidebar-transform-styles';
        style.textContent = `
            /* Optimize: Target specific elements instead of universal selector */
            .hover-sidebar-transforming [data-sidebar="header"],
            .hover-sidebar-transforming [data-sidebar="content"],
            .hover-sidebar-transforming [data-sidebar="footer"],
            .hover-sidebar-transforming [data-sidebar="menu-button"] {
                transition: none !important;
                animation: none !important;
            }

            /* HIDE main sidebar during transformation */
            body:has(.hover-sidebar-transforming) [data-sidebar="sidebar"] {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            /* Optimize: Use transform instead of margin-left for GPU acceleration */
            body:has(.hover-sidebar-transforming) [data-sidebar="sidebar-inset"] {
                will-change: transform, opacity !important;
                transform: translateX(var(--sidebar-width, 16rem)) !important;
                opacity: 0.96 !important;
                transition: transform 350ms ease-out, opacity 350ms ease-out !important;
            }

            /* Show main sidebar container instantly */
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar"] {
                opacity: 1 !important;
                visibility: visible !important;
                transition: none !important;
                animation: none !important;
                transform: none !important;
            }

            /* Optimize: Only animate direct children, not all descendants */
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar"] > [data-sidebar="header"],
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar"] > [data-sidebar="content"],
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar"] > [data-sidebar="footer"] {
                animation: fadeInSidebarContent 250ms ease-out forwards !important;
            }

            @keyframes fadeInSidebarContent {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            /* Restore page content - remove will-change after animation */
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar-inset"] {
                will-change: auto !important;
                transform: translateX(0) !important;
                opacity: 1 !important;
                transition: transform 200ms ease-out, opacity 200ms ease-out !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            const existingStyle = document.getElementById('hover-sidebar-transform-styles');
            if (existingStyle) {
                document.head.removeChild(existingStyle);
            }
        };
    }, []);

    // Show during transformation or when visible
    if (isMobile || (!isVisible && !isTransforming)) return null;

    return (
        <div
            ref={sidebarRef}
            className={`fixed z-50 w-64 bg-sidebar border-r border-border shadow-2xl ${isTransforming
                ? "hover-sidebar-transforming transition-all duration-[350ms] ease-out h-screen rounded-none"
                : "transition-all duration-300 ease-out h-[70vh] rounded-r-2xl"
                }`}
            style={{
                left: 0,
                top: isTransforming ? 0 : "15vh",
                animation: isVisible && !isTransforming ? "slideInFromLeft 0.3s ease-out" : undefined,
            }}
        >
            <style jsx>{`
                @keyframes slideInFromLeft {
                    from {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
            `}</style>
            {/* EXACT structure match to default sidebar */}
            <div className="flex h-full w-full flex-col bg-sidebar">
                {/* Header with data attribute */}
                <div data-sidebar="header" className="flex flex-col gap-2 p-2">
                    <div className="px-2 py-2">
                        <div className="flex items-center gap-3 h-12 rounded-md px-2 select-none">
                            <img
                                src="/rnd.png"
                                width={32}
                                height={32}
                                alt="RnD Admin"
                                className="size-8 rounded-md"
                            />
                            <span className={`font-semibold text-lg ${pressStart.className}`}>
                                RnD Admin
                            </span>
                        </div>
                    </div>
                    <hr className="border-t border-border mx-2 -mt-px" />
                </div>

                {/* Content with data attribute */}
                <div data-sidebar="content" className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                    {/* Sections Group */}
                    <div data-sidebar="group" className="relative flex w-full min-w-0 flex-col p-2">
                        <div data-sidebar="group-label" className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium uppercase text-muted-foreground/60">
                            Sections
                        </div>
                        <div data-sidebar="group-content" className="w-full text-sm px-2">
                            <ul data-sidebar="menu" className="flex w-full min-w-0 flex-col gap-1">
                                <li data-sidebar="menu-item" className="group/menu-item relative">
                                    <a
                                        href="/dashboard"
                                        data-sidebar="menu-button"
                                        data-active="true"
                                        className="flex w-full items-center overflow-hidden p-2 text-left gap-3 h-9 rounded-md bg-gradient-to-r from-yellow-500/12 to-yellow-500/5 border border-yellow-500/30 text-yellow-600 font-medium transition-colors hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40"
                                    >
                                        <RiScanLine
                                            className="text-yellow-500 shrink-0"
                                            size={22}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">Dashboard</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Other Group */}
                    <div data-sidebar="group" className="relative flex w-full min-w-0 flex-col p-2">
                        <div data-sidebar="group-label" className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium uppercase text-muted-foreground/60">
                            Other
                        </div>
                        <div data-sidebar="group-content" className="w-full text-sm px-2">
                            <ul data-sidebar="menu" className="flex w-full min-w-0 flex-col gap-1">
                                <li data-sidebar="menu-item" className="group/menu-item relative">
                                    <a
                                        href="#"
                                        data-sidebar="menu-button"
                                        data-active="false"
                                        className="flex w-full items-center overflow-hidden p-2 text-left gap-3 h-9 rounded-md font-medium transition-colors hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40"
                                    >
                                        <RiSettings3Line
                                            className="text-muted-foreground/60 shrink-0"
                                            size={22}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">Settings</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer with data attribute */}
                <div data-sidebar="footer" className="flex flex-col gap-2 p-2">
                    <hr className="border-t border-border mx-2 -mt-px" />
                    <ul data-sidebar="menu" className="flex w-full min-w-0 flex-col gap-1">
                        <li data-sidebar="menu-item" className="group/menu-item relative">
                            <a
                                href="/logout"
                                data-sidebar="menu-button"
                                data-active="false"
                                className="flex w-full items-center overflow-hidden p-2 text-left gap-3 h-9 rounded-md font-medium transition-colors hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40"
                            >
                                <RiLogoutBoxLine
                                    className="text-muted-foreground/60 shrink-0"
                                    size={22}
                                    aria-hidden="true"
                                />
                                <span className="truncate">Sign Out</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
