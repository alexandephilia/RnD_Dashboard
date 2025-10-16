import { JetBrains_Mono } from "next/font/google";

import "./globals.css";

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
      <body className={`${fontMono.variable} font-mono antialiased`}>
        {children}
      </body>
    </html>
  );
}
