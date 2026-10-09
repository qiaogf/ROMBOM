import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { LayoutClientShell } from "@/components/layout/LayoutClientShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Global-TECH - Cross-Border MRO Industrial Supply",
    template: "%s | Global-TECH",
  },
  description:
    "Global-TECH - Premium cross-border MRO industrial supply platform. Source industrial parts, automation components, and MRO products from trusted suppliers worldwide.",
  keywords: [
    "MRO",
    "industrial supply",
    "cross-border",
    "automation",
    "Siemens",
    "industrial parts",
    "B2B marketplace",
  ],
  authors: [{ name: "Global-TECH" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Global-TECH",
    title: "Global-TECH - Cross-Border MRO Industrial Supply",
    description:
      "Premium cross-border MRO industrial supply platform. Source industrial parts, automation components, and MRO products from trusted suppliers worldwide.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Global-TECH - Cross-Border MRO Industrial Supply",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Global-TECH - Cross-Border MRO Industrial Supply",
    description:
      "Premium cross-border MRO industrial supply platform. Source industrial parts, automation components, and MRO products from trusted suppliers worldwide.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: { icon: "/favicon.ico", apple: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`scroll-smooth ${inter.variable}`}>
      {/* h-screen 回退 + dvh 动态视口：修复移动端浏览器地址栏可见时 100vh 大于实际可视高度、Footer 被推出屏幕且无法滚动到达的问题 */}
      <body className="h-screen supports-[height:100dvh]:h-dvh flex flex-col bg-white text-slate-900 antialiased overflow-hidden">
        <LayoutClientShell>{children}</LayoutClientShell>
      </body>
    </html>
  );
}
