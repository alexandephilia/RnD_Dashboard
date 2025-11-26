"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useFloatingSidebar } from "./sidebar-hover-trigger";

export function SidebarTriggerSmart({ className }: { className?: string }) {
    const { isFloatingVisible, isTransforming, triggerTransformation, isMobile } = useFloatingSidebar();
    const { toggleSidebar } = useSidebar();

    const handleClickCapture = (e: React.MouseEvent) => {
        // On mobile: let the SidebarTrigger handle it directly (it calls toggleSidebar which toggles openMobile)
        if (isMobile) {
            // Don't intercept - let SidebarTrigger's onClick fire normally
            return;
        }

        // Desktop with floating sidebar visible: intercept and transform
        if (isFloatingVisible && !isTransforming) {
            e.preventDefault();
            e.stopPropagation();
            triggerTransformation();
            return;
        }

        // Desktop without floating sidebar: let SidebarTrigger handle it normally
        // (it will toggle the main sidebar)
    };

    return (
        <div onClickCapture={handleClickCapture}>
            <SidebarTrigger className={className} />
        </div>
    );
}
