"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { Press_Start_2P } from "next/font/google";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { DesktopSidebarContent } from "./app-sidebar";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"] });

// Context to share floating sidebar state
type FloatingSidebarContextType = {
    isFloatingVisible: boolean;
    isTransforming: boolean;
    triggerTransformation: () => void;
};

const FloatingSidebarContext = createContext<FloatingSidebarContextType | null>(null);

export function useFloatingSidebar() {
    const context = useContext(FloatingSidebarContext);
    if (!context) {
        throw new Error("useFloatingSidebar must be used within FloatingSidebarProvider");
    }
    return context;
}

export function FloatingSidebarProvider({ children }: { children: React.ReactNode }) {
    const { open: mainSidebarOpen, setOpen, isMobile } = useSidebar();
    const [isVisible, setIsVisible] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const [showMethod, setShowMethod] = useState<'hover' | 'click' | null>(null);
    const isTransformingRef = useRef(false);

    const triggerTransformation = () => {
        if (!isVisible || isTransformingRef.current || mainSidebarOpen) return;

        isTransformingRef.current = true;
        setIsTransforming(true);
        setShowMethod('click'); // Mark as click-triggered transformation

        // Add class to body to trigger CSS rules
        document.body.classList.add('hover-sidebar-transforming');

        // Wait for transformation animation to complete
        setTimeout(() => {
            document.body.classList.remove('hover-sidebar-transforming');
            document.body.classList.add('hover-sidebar-transform-complete');

            // Now actually open the main sidebar
            setOpen(true);

            // Keep floating sidebar visible until main sidebar content fade completes
            setTimeout(() => {
                setIsVisible(false);
                setIsTransforming(false);
                setShowMethod(null);
                isTransformingRef.current = false;
                document.body.classList.remove('hover-sidebar-transform-complete');
            }, 320);
        }, 350);
    };

    const value = {
        isFloatingVisible: isVisible,
        isTransforming,
        triggerTransformation,
    };

    return (
        <FloatingSidebarContext.Provider value={value}>
            {children}
            <SidebarHoverTrigger
                isVisible={isVisible}
                setIsVisible={setIsVisible}
                setShowMethod={setShowMethod}
                showMethod={showMethod}
                isTransforming={isTransforming}
                mainSidebarOpen={mainSidebarOpen}
                isMobile={isMobile}
            />
        </FloatingSidebarContext.Provider>
    );
}

type SidebarHoverTriggerProps = {
    isVisible: boolean;
    setIsVisible: (visible: boolean) => void;
    setShowMethod: (method: 'hover' | 'click' | null) => void;
    showMethod: 'hover' | 'click' | null;
    isTransforming: boolean;
    mainSidebarOpen: boolean;
    isMobile: boolean;
};

function SidebarHoverTrigger({
    isVisible,
    setIsVisible,
    setShowMethod,
    showMethod,
    isTransforming,
    mainSidebarOpen,
    isMobile,
}: SidebarHoverTriggerProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [isSlideOut, setIsSlideOut] = useState(false);

    // Set body attribute whenever floating sidebar is visible
    useEffect(() => {
        if (isVisible || isTransforming) {
            document.body.setAttribute('data-floating-sidebar-active', '');
        } else {
            document.body.removeAttribute('data-floating-sidebar-active');
        }
    }, [isVisible, isTransforming]);

    // Auto-dismiss after 4 seconds when cursor leaves sidebar area
    const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        // Cancel any pending dismiss when mouse re-enters
        if (dismissTimeoutRef.current) {
            clearTimeout(dismissTimeoutRef.current);
            dismissTimeoutRef.current = null;
        }
        setIsSlideOut(false);
    };

    const handleMouseLeave = () => {
        if (!isVisible || isTransforming || mainSidebarOpen) return;

        // Start 4-second countdown when mouse leaves
        dismissTimeoutRef.current = setTimeout(() => {
            // Start slide-out animation
            setIsSlideOut(true);

            // After animation completes, hide sidebar
            setTimeout(() => {
                setIsVisible(false);
                setShowMethod(null);
                setIsSlideOut(false);
            }, 300); // Match slide-out animation duration
        }, 4000); // 4 seconds
    };

    // Cleanup timeout on unmount or state changes
    useEffect(() => {
        return () => {
            if (dismissTimeoutRef.current) {
                clearTimeout(dismissTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isMobile) {
            setIsVisible(false);
            return;
        }

        if (mainSidebarOpen && !isTransforming) {
            setIsVisible(false);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            const triggerZone = 15;
            const isInTriggerZone = e.clientX <= triggerZone;

            if (isInTriggerZone && !isVisible && !mainSidebarOpen && !isTransforming) {
                setIsVisible(true);
                setShowMethod('hover'); // Mark as hover-triggered
            }
        };

        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [isMobile, mainSidebarOpen, isVisible, isTransforming, setIsVisible, setShowMethod]);

    // Inject CSS for seamless transformation
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'hover-sidebar-transform-styles';
        style.textContent = `

            /* Disable wrapper transitions during completion phase */
            body:has(.hover-sidebar-transform-complete) .peer[data-sidebar] {
                transition: none !important;
                opacity: 0;
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

    // Determine animation state:
    // - Hover-triggered AND not transforming → play slide-in
    // - Click-triggered OR transforming → skip slide-in, go straight to transform
    // - Slide-out state → play slide-out animation
    const shouldPlaySlideIn = isVisible && !isTransforming && showMethod === 'hover' && !isSlideOut;
    const isInTransformation = isTransforming;

    return (
        <div
            ref={sidebarRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`fixed z-50 w-64 bg-sidebar border-r border-border ${isInTransformation
                ? "hover-sidebar-transforming h-screen rounded-none shadow-lg"
                : isSlideOut
                    ? "floating-sidebar-slide-out h-[70vh] rounded-r-2xl shadow-2xl"
                    : shouldPlaySlideIn
                        ? "floating-sidebar-slide-in h-[70vh] rounded-r-2xl shadow-2xl"
                        : "h-[70vh] rounded-r-2xl shadow-2xl"
                }`}
            style={{
                left: 0,
                top: isTransforming ? 0 : "15vh",
                transition: isInTransformation ? "all 350ms ease-out" : "none",
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
                }

                @keyframes slideOutToLeft {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                }

                .floating-sidebar-slide-in {
                    animation: slideInFromLeft 0.3s ease-out;
                }

                .floating-sidebar-slide-out {
                    animation: slideOutToLeft 0.3s ease-in;
                }

                .hover-sidebar-transforming {
                    animation: none !important;
                }
            `}</style>
            {/* Use the shared DesktopSidebarContent component */}
            <DesktopSidebarContent />
        </div>
    );
}
