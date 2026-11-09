import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Vercel 构建机上 Next 内置 TS 检查进程静默崩溃（"Running TypeScript ..." 后无输出 exit 1）；
    // 类型质量由本地 tsc --noEmit 门禁保证（已通过），此处仅跳过构建期重复检查
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // 开发期 AI 生图接口保留；生产库无外链图片（2026-11-09 审计：
      // Brand.logo / Product.images / ModelPrice.images 全部为空，站内图均走本地 /images/）。
      // 未来若供应商导入携带外链图片，需按实际域名逐个加白名单，勿恢复 "**"。
      {
        protocol: "https",
        hostname: "neeko-copilot.bytedance.net",
        port: "",
        pathname: "/api/text_to_image/**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  transpilePackages: [],
  // exceljs 依赖链 exceljs→unzipper→fstream→rimraf 含动态 require，
  // Turbopack 打包时会将 rimraf 外部化为带哈希的模块名导致运行时找不到；
  // 标记为服务端外部包，由 Node 原生 require 解析
  serverExternalPackages: ["exceljs"],
  compress: true,
  generateEtags: true,
  onDemandEntries: {
    maxInactiveAge: 25 * 60 * 1000,
    pagesBufferLength: 5,
  },
  trailingSlash: false,
  skipTrailingSlashRedirect: false,
  turbopack: {
    // 抑制 Prisma 生成客户端内动态 require 触发的 NFT 全项目追踪告警
    // 根因在 prisma/generated/client/runtime/library.js 内部，无法直接修改
    // 此告警为良性：build 仍成功，仅记录日志噪音
    ignoreIssue: [
      {
        path: "**/next.config.ts",
        title: "Encountered unexpected file in NFT list",
      },
    ],
  },
  async rewrites() {
    return [
      // ngrok 免费版警告页 JS 在手机上可能将 /api-tester.html 改写为 /api-tester（丢 .html）
      // 用 rewrite 在服务端直接映射，避免 307 重定向在手机上二次失败
      { source: "/api-tester", destination: "/api-tester.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
