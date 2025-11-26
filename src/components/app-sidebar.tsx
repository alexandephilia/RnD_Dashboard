import { useIsMobile } from "@/hooks/use-mobile";
import { Press_Start_2P } from "next/font/google";
import * as React from "react";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"] });

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import { RiLogoutBoxLine, RiScanLine, RiSettings3Line } from "@remixicon/react";

// Navigation data shared between mobile and desktop
const navigationData = {
    teams: [
        {
            name: "InnovaCraft",
            logo: "https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp1/logo-01_kp2j8x.png",
        },
        {
            name: "Acme Corp.",
            logo: "https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp1/logo-01_kp2j8x.png",
        },
        {
            name: "Evil Corp.",
            logo: "https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp1/logo-01_kp2j8x.png",
        },
    ],
    navMain: [
        {
            title: "Sections",
            url: "#",
            items: [
                {
                    title: "Dashboard",
                    url: "/dashboard",
                    icon: RiScanLine,
                    isActive: true,
                },
            ],
        },
        {
            title: "Other",
            url: "#",
            items: [
                {
                    title: "Settings",
                    url: "#",
                    icon: RiSettings3Line,
                    isActive: false,
                },
            ],
        },
    ],
};

// Desktop sidebar content - shown in floating hover and desktop sidebar
function DesktopSidebarContent() {
    return (
        <>
            <SidebarHeader>
                <div className="px-2 py-2">
                    <div className="flex items-center h-12 rounded-md px-2 select-none">
                        <span className={`font-semibold text-lg ${pressStart.className}`}>RnD Admin</span>
                    </div>
                </div>
                <hr className="border-t border-border mx-2 -mt-px" />
            </SidebarHeader>
            <SidebarContent>
                {navigationData.navMain.map((item) => (
                    <SidebarGroup key={item.title}>
                        <SidebarGroupLabel className="uppercase text-muted-foreground/60">
                            {item.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent className="px-2">
                            <SidebarMenu>
                                {item.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            className="group/menu-button font-medium gap-3 h-9 rounded-md bg-gradient-to-r transition-colors hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:!bg-transparent data-[active=true]:from-yellow-500/12 data-[active=true]:to-yellow-500/5 data-[active=true]:border data-[active=true]:border-yellow-500/30 data-[active=true]:!text-yellow-600 [&>svg]:size-auto"
                                            isActive={item.isActive}
                                        >
                                            <a href={item.url}>
                                                {item.icon && (
                                                    <item.icon
                                                        className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-yellow-500"
                                                        size={22}
                                                        aria-hidden="true"
                                                        suppressHydrationWarning
                                                    />
                                                )}
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
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
        </>
    );
}

// Mobile sidebar content - simplified for mobile screens
function MobileSidebarContent() {
    return (
        <>
            <SidebarHeader>
                <div className="px-3 py-4">
                    <div className="flex items-center h-10 rounded-lg px-3 select-none">
                        <span className={`font-semibold text-base ${pressStart.className}`}>RnD Admin</span>
                    </div>
                </div>
                <hr className="border-t border-border mx-3 -mt-px" />
            </SidebarHeader>
            <SidebarContent>
                {navigationData.navMain.map((item) => (
                    <SidebarGroup key={item.title}>
                        <SidebarGroupLabel className="uppercase text-muted-foreground/50 text-xs font-semibold px-3">
                            {item.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent className="px-2">
                            <SidebarMenu>
                                {item.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            className="group/menu-button font-medium gap-3 h-10 rounded-lg transition-colors hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-5"
                                            isActive={item.isActive}
                                        >
                                            <a href={item.url}>
                                                {item.icon && (
                                                    <item.icon
                                                        className="text-muted-foreground group-data-[active=true]/menu-button:text-sidebar-accent-foreground"
                                                        size={20}
                                                        aria-hidden="true"
                                                        suppressHydrationWarning
                                                    />
                                                )}
                                                <span className="text-sm">{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>
                <hr className="border-t border-border mx-3 -mt-px" />
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="font-medium gap-3 h-10 rounded-lg transition-colors hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-5">
                            <a href="/logout">
                                <RiLogoutBoxLine
                                    className="text-muted-foreground group-data-[active=true]/menu-button:text-sidebar-accent-foreground"
                                    size={20}
                                    aria-hidden="true"
                                    suppressHydrationWarning
                                />
                                <span className="text-sm">Sign Out</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </>
    );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const isMobile = useIsMobile();

    return (
        <Sidebar {...props} className={isMobile ? "w-72" : "w-64"}>
            {isMobile ? <MobileSidebarContent /> : <DesktopSidebarContent />}
            <SidebarRail />
        </Sidebar>
    );
}

// Export the navigation data for use in floating sidebar
export { DesktopSidebarContent, navigationData };

