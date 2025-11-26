"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useFloatingSidebar } from "./sidebar-hover-trigger";

export function SidebarTriggerSmart({ className }: { className?: string }) {
    const { isFloatingVisible, isTransforming, triggerTransformation } = useFloatingSidebar();
    const { toggleSidebar } = useSidebar();

    const handleClickCapture = (e: React.MouseEvent) => {
        // Capture phase - intercept BEFORE SidebarTrigger processes the event
        if (isFloatingVisible && !isTransforming) {
            e.preventDefault();
            e.stopPropagation();
            // Trigger transformation immediately in capture phase
            triggerTransformation();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        // Bubble phase - only runs if capture didn't stop propagation
        // This means floating sidebar is NOT visible, so do normal toggle
        if (!isFloatingVisible) {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        }
    };

    return (
        <div
            onClickCapture={handleClickCapture}
            onClick={handleClick}
        >
            <SidebarTrigger className={className} />
        </div>
    );
}
