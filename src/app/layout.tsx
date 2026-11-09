import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { LayoutClientShell } from "@/components/layout/LayoutClientShell";
import { NoNativeTooltip } from "@/components/layout/NoNativeTooltip";
import "./globals.css";

// 本地 Inter 可变字体（latin 子集，覆盖 100–900 字重）
// 构建期不再请求 Google Fonts，避免网络环境导致构建失败
const inter = localFont({
  src: "../../public/fonts/inter/inter-variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});

// 本地 Bebas Neue（仅 400 字重，latin 子集）— 用于左上角 Global-TECH 站点标识
const bebasNeue = localFont({
  src: "../../public/fonts/bebas-neue/bebas-neue-regular.woff2",
  weight: "400",
  display: "swap",
  variable: "--font-bebas",
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
    <html lang="en" data-scroll-behavior="smooth" className={`scroll-smooth ${inter.variable} ${bebasNeue.variable}`}>
      {/* h-screen 回退 + dvh 动态视口：修复移动端浏览器地址栏可见时 100vh 大于实际可视高度、Footer 被推出屏幕且无法滚动到达的问题 */}
      <body className="h-screen supports-[height:100dvh]:h-dvh flex flex-col bg-white text-slate-900 antialiased overflow-hidden">
        <NoNativeTooltip />
        <LayoutClientShell>{children}</LayoutClientShell>
      </body>
    </html>
  );
}
