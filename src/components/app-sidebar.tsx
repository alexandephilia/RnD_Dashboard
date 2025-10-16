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
import { RiBankCardLine, RiLogoutBoxLine, RiScanLine, RiSettings3Line } from "@remixicon/react";

// This is sample data.
const data = {
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
                {
                    title: "Payment Demo",
                    url: "/payment",
                    icon: RiBankCardLine,
                    isActive: false,
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>
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
                        <span className={`font-semibold text-lg ${pressStart.className}`}>RnD Admin</span>
                    </div>
                </div>
                <hr className="border-t border-border mx-2 -mt-px" />
            </SidebarHeader>
            <SidebarContent>
                {/* We create a SidebarGroup for each parent. */}
                {data.navMain.map((item) => (
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
            <SidebarRail />
        </Sidebar>
    );
}
