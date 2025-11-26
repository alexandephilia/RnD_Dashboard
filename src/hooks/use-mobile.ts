import * as React from "react";

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
    // undefined = not yet determined (SSR/initial), boolean = determined
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

    React.useEffect(() => {
        const checkMobile = () => window.innerWidth < MOBILE_BREAKPOINT;
        setIsMobile(checkMobile());

        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = () => setIsMobile(checkMobile());

        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);

    return isMobile;
}
