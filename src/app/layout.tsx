import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
    default: "GlobalShop - Premium Cross-Border Store",
    template: "%s | GlobalShop",
  },
  description: "GlobalShop - Premium cross-border e-commerce store. Discover quality products from around the world with fast shipping, secure payments, and exceptional customer service.",
  keywords: ["cross-border", "ecommerce", "online shopping", "global store", "international trade", "premium products", "worldwide shipping"],
  authors: [{ name: "GlobalShop" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "GlobalShop",
    title: "GlobalShop - Premium Cross-Border Store",
    description: "Discover quality products from around the world with fast shipping, secure payments, and exceptional customer service.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GlobalShop - Premium Cross-Border Store",
    description: "Discover quality products from around the world with fast shipping, secure payments, and exceptional customer service.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <Header />
        <main className="flex-1 pt-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
