"use client";

import { useSidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
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

            /* Show main sidebar DURING transformation - positioned underneath */
            body:has(.hover-sidebar-transforming) [data-sidebar="sidebar"] {
                opacity: 1 !important;
                visibility: visible !important;
                transition: none !important;
                animation: none !important;
                transform: none !important;
                pointer-events: none !important;
            }

            /* Force disable ALL transitions on sidebar wrapper */
            body:has(.hover-sidebar-transforming) .peer[data-sidebar],
            body:has(.hover-sidebar-transform-complete) .peer[data-sidebar] {
                transition: none !important;
            }

            /* Page content shifts DURING transformation - synchronized */
            body:has(.hover-sidebar-transforming) [data-sidebar="sidebar-inset"] {
                will-change: transform !important;
                transform: translateX(var(--sidebar-width, 16rem)) !important;
                transition: transform 350ms ease-out !important;
            }

            /* After transformation - main sidebar takes over */
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar"] {
                opacity: 1 !important;
                visibility: visible !important;
                transition: none !important;
                animation: none !important;
                transform: none !important;
                pointer-events: auto !important;
            }

            /* Page content stays in final position */
            body:has(.hover-sidebar-transform-complete) [data-sidebar="sidebar-inset"] {
                will-change: auto !important;
                transform: translateX(0) !important;
                transition: none !important;
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
            className={`fixed z-50 w-64 bg-sidebar border-r border-border ${isTransforming
                ? "hover-sidebar-transforming transition-all duration-[350ms] ease-out h-screen rounded-none shadow-lg"
                : "transition-all duration-300 ease-out h-[70vh] rounded-r-2xl shadow-2xl"
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
            <div data-sidebar="sidebar" className="flex h-full w-full flex-col bg-sidebar">
                {/* Header with data attribute */}
                <SidebarHeader>
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
                </SidebarHeader>

                {/* Content with data attribute */}
                <SidebarContent>
                    {/* Sections Group */}
                    <SidebarGroup>
                        <SidebarGroupLabel className="uppercase text-muted-foreground/60">
                            Sections
                        </SidebarGroupLabel>
                        <SidebarGroupContent className="px-2">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        className="group/menu-button font-medium gap-3 h-9 rounded-md bg-gradient-to-r transition-colors hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:!bg-transparent data-[active=true]:from-yellow-500/12 data-[active=true]:to-yellow-500/5 data-[active=true]:border data-[active=true]:border-yellow-500/30 data-[active=true]:!text-yellow-600 [&>svg]:size-auto"
                                        isActive
                                    >
                                        <a href="/dashboard">
                                            <RiScanLine
                                                className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-yellow-500"
                                                size={22}
                                                aria-hidden="true"
                                                suppressHydrationWarning
                                            />
                                            <span>Dashboard</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Other Group */}
                    <SidebarGroup>
                        <SidebarGroupLabel className="uppercase text-muted-foreground/60">
                            Other
                        </SidebarGroupLabel>
                        <SidebarGroupContent className="px-2">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        className="group/menu-button font-medium gap-3 h-9 rounded-md bg-gradient-to-r transition-colors hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:!bg-transparent data-[active=true]:from-yellow-500/12 data-[active=true]:to-yellow-500/5 data-[active=true]:border data-[active=true]:border-yellow-500/30 data-[active=true]:!text-yellow-600 [&>svg]:size-auto"
                                    >
                                        <a href="#">
                                            <RiSettings3Line
                                                className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-yellow-500"
                                                size={22}
                                                aria-hidden="true"
                                                suppressHydrationWarning
                                            />
                                            <span>Settings</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                {/* Footer with data attribute */}
                <SidebarFooter>
                    <hr className="border-t border-border mx-2 -mt-px" />
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild className="font-medium gap-3 h-9 rounded-md bg-gradient-to-r hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-yellow-500/15 data-[active=true]:to-yellow-500/5 [&>svg]:size-auto">
                                <a href="/logout">
                                    <RiLogoutBoxLine
                                        className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-yellow-500"
                                        size={22}
                                        aria-hidden="true"
                                        suppressHydrationWarning
                                    />
                                    <span>Sign Out</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </div>
        </div>
    );
}
