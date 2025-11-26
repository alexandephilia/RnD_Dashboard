import PixelBlast from "@/components/effects/PixelBlast";
import { JetBrains_Mono } from "next/font/google";

import "./globals.css";

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

const fontMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark scheme-only-dark" suppressHydrationWarning>
            <body className={`${fontMono.variable} font-mono antialiased relative bg-background text-foreground`}>
                <PixelBlast
                    variant="circle"
                    pixelSize={6}
                    color="#FACC15"
                    patternScale={3}
                    patternDensity={1.2}
                    pixelSizeJitter={0.5}
                    enableRipples
                    rippleSpeed={0.4}
                    rippleThickness={0.12}
                    rippleIntensityScale={1.5}
                    liquid
                    liquidStrength={0.12}
                    liquidRadius={1.2}
                    liquidWobbleSpeed={5}
                    wave
                    waveStrength={20}
                    waveFrequency={0.03}
                    speed={0.6}
                    edgeFade={0.25}
                    transparent
                    respectLayout={false}
                />
                <div className="relative z-10 min-h-svh" data-pixelblast-target="true">
                    {children}
                </div>
            </body>
        </html>
    );
}
