import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "neeko-copilot.bytedance.net",
        port: "",
        pathname: "/api/text_to_image/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizeCss: true,
  },
  transpilePackages: [],
  compress: true,
  generateEtags: true,
  onDemandEntries: {
    maxInactiveAge: 25 * 60 * 1000,
    pagesBufferLength: 5,
  },
  trailingSlash: false,
  skipTrailingSlashRedirect: false,
};

export default nextConfig;
