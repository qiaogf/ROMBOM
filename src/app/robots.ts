import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // 后台与敏感路径不允许索引
          "/admin",
          "/supplier",
          "/customer",
          "/auth",
          "/api",
          "/checkout",
          "/cart",
          "/orders",
          "/account",
        ],
      },
      // 阻止常见爬虫 UA（反爬辅助，非硬性防护）
      {
        userAgent: ["GPTBot", "CCBot", "ChatGPT-User", "Google-Extended", "anthropic-ai", "Claude-Web"],
        disallow: ["/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}