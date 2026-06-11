if (typeof window === 'undefined' && typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
  try {
    delete (globalThis as any).localStorage;
  } catch (e) {}
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ElastiCrew — AI-Powered Video Interview Platform",
  description:
    "ElastiCrew is the modern AI-powered video interview screening platform for teams that want to hire smarter, faster, and more fairly.",
  keywords: ["video interview", "AI screening", "recruitment", "HR SaaS", "candidate interview", "ElastiCrew"],
  openGraph: {
    title: "ElastiCrew — AI-Powered Video Interview Platform",
    description: "Screen candidates with AI-guided video interviews. One link, one interview, smarter hiring decisions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
