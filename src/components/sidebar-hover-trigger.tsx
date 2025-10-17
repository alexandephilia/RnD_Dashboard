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

            // After animation completes, show main sidebar and hide hover sidebar
            setTimeout(() => {
                document.body.classList.remove('hover-sidebar-transforming');
                document.body.classList.add('hover-sidebar-transform-complete');

                setTimeout(() => {
                    setIsVisible(false);
                    setIsTransforming(false);
                    document.body.classList.remove('hover-sidebar-transform-complete');
                }, 50);
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
            /* HIDE main sidebar completely during transformation */
            body:has(.hover-sidebar-transforming) [data-sidebar="sidebar"] {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            /* Show main sidebar instantly after transformation - NO ANIMATION */
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar"] {
                opacity: 1 !important;
                visibility: visible !important;
                transition: none !important;
                animation: none !important;
                transform: none !important;
            }

            /* Disable animations on all children during reveal */
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar"] * {
                transition: none !important;
                animation: none !important;
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
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-4 py-4 border-b border-border">
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-4">
                    <div className="px-4 space-y-6">
                        {/* Sections */}
                        <div>
                            <div className="px-2 mb-2 text-xs font-semibold uppercase text-muted-foreground/60">
                                Sections
                            </div>
                            <a
                                href="/dashboard"
                                className="flex items-center gap-3 h-9 px-3 rounded-md bg-gradient-to-r from-yellow-500/12 to-yellow-500/5 border border-yellow-500/30 text-yellow-600 font-medium transition-colors"
                            >
                                <RiScanLine
                                    className="text-yellow-500"
                                    size={22}
                                    aria-hidden="true"
                                />
                                <span>Dashboard</span>
                            </a>
                        </div>

                        {/* Other */}
                        <div>
                            <div className="px-2 mb-2 text-xs font-semibold uppercase text-muted-foreground/60">
                                Other
                            </div>
                            <a
                                href="#"
                                className="flex items-center gap-3 h-9 px-3 rounded-md hover:bg-sidebar-accent font-medium transition-colors"
                            >
                                <RiSettings3Line
                                    className="text-muted-foreground/60"
                                    size={22}
                                    aria-hidden="true"
                                />
                                <span>Settings</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-border p-4">
                    <a
                        href="/logout"
                        className="flex items-center gap-3 h-9 px-3 rounded-md hover:bg-sidebar-accent font-medium transition-colors"
                    >
                        <RiLogoutBoxLine
                            className="text-muted-foreground/60"
                            size={22}
                            aria-hidden="true"
                        />
                        <span>Sign Out</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
