import { prisma } from "../src/lib/prisma";
import { CONTENT_KEYS, DEFAULT_CONTENT } from "../src/lib/content";

/**
 * 一次性把现有 About / Terms 正文写入 SiteContent。
 * 已存在的 key 跳过，不会覆盖后台已编辑的内容。
 */
async function main() {
  for (const key of CONTENT_KEYS) {
    const existing = await prisma.siteContent.findUnique({ where: { key } });
    if (existing) {
      console.log(`${key}: already exists, skipped`);
      continue;
    }
    await prisma.siteContent.create({ data: { key, value: DEFAULT_CONTENT[key] } });
    console.log(`${key}: seeded (${DEFAULT_CONTENT[key].length} chars)`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
