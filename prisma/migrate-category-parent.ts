import { PrismaClient } from "../prisma/generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 检查类目数据...");

  // 获取所有类目
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      categoryId: true,
      categoryName: true,
      parentId: true,
      sortOrder: true,
    }
  });

  console.log("\n📋 当前所有类目:");
  categories.forEach(cat => {
    console.log(`  ID: ${cat.categoryId}`);
    console.log(`  名称: ${cat.categoryName}`);
    console.log(`  parentId: ${cat.parentId}`);
    console.log(`  sortOrder: ${cat.sortOrder}`);
    console.log("---");
  });

  // 找到 Power 类目
  const powerCategory = categories.find(c => c.categoryName === "Power");
  const powerDistributionCategory = categories.find(c => c.categoryName === "Power distribution & control");

  if (powerCategory && powerDistributionCategory) {
    console.log("\n🔧 修正数据...");
    console.log(`  Power ID: ${powerCategory.categoryId}`);
    console.log(`  Power distribution & control 当前 parentId: ${powerDistributionCategory.parentId}`);

    // 如果 "Power distribution & control" 的 parentId 不是 "Power"，则修正
    if (powerDistributionCategory.parentId !== powerCategory.categoryId) {
      console.log(`  更新 parentId 为: ${powerCategory.categoryId}`);

      await prisma.category.update({
        where: { categoryId: powerDistributionCategory.categoryId },
        data: { parentId: powerCategory.categoryId }
      });

      console.log("✅ 修正完成！");
    } else {
      console.log("✅ 数据已经正确，无需修正");
    }
  } else {
    console.log("\n⚠️ 未找到相关类目");
    if (!powerCategory) console.log("  未找到 'Power' 类目");
    if (!powerDistributionCategory) console.log("  未找到 'Power distribution & control' 类目");
  }

  console.log("\n✅ 数据检查完成");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
