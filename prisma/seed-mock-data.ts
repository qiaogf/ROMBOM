import { PrismaClient } from "./generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 插入 Mock 数据...");

  // ========== 1. 查找或创建类目 ==========
  // 先获取已有的类目
  const existingCategories = await prisma.category.findMany({
    select: { categoryId: true, categoryName: true, slug: true },
  });
  console.log(`📋 现有类目数: ${existingCategories.length}`);

  // 选取或创建几个有产品的类目
  const categorySlugs = ["control", "electrical-components", "sensing"];
  const categoryIds: Record<string, string> = {};

  for (const slug of categorySlugs) {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (category) {
      categoryIds[slug] = category.categoryId;
      console.log(`  ✅ 类目存在: ${category.categoryName} (${slug})`);
    }
  }

  if (Object.keys(categoryIds).length === 0) {
    console.log("  ⚠️ 没有找到有效类目，将创建新类目...");
    // 创建新类目
    const newCategories = [
      { name: "Control Systems", slug: "control", desc: "Industrial control systems and PLCs" },
      { name: "Electrical Components", slug: "electrical-components", desc: "Switches, relays, contactors" },
      { name: "Sensing & Detection", slug: "sensing", desc: "Sensors, transducers, detectors" },
    ];
    
    for (const cat of newCategories) {
      const created = await prisma.category.create({
        data: {
          categoryName: cat.name,
          slug: cat.slug,
          briefDesc: cat.desc,
          parentId: "0",
          level: 1,
          sortOrder: 0,
          isActive: true,
        },
      });
      categoryIds[cat.slug] = created.categoryId;
      console.log(`  ✅ 创建类目: ${cat.name} (${cat.slug})`);
    }
  }

  // ========== 2. 查找或创建品牌 ==========
  // 确保存在默认供应商（Brand 必须归属一个供应商）
  let defaultSupplier = await prisma.supplier.findFirst();
  if (!defaultSupplier) {
    defaultSupplier = await prisma.supplier.create({
      data: { supplierName: "Default Supplier", email: "default@supplier.local", passwordHash: "disabled" },
    });
    console.log(`  ✅ 创建默认供应商: ${defaultSupplier.supplierId}`);
  }
  const defaultSupplierId = defaultSupplier.supplierId;

  const brandSlugs = ["abb", "siemens", "omron"];
  const brandIds: Record<string, string> = {};

  for (const slug of brandSlugs) {
    const brand = await prisma.brand.findUnique({ where: { slug } });
    if (brand) {
      brandIds[slug] = brand.brandId;
      console.log(`  ✅ 品牌存在: ${brand.brandName} (${slug})`);
    }
  }

  if (Object.keys(brandIds).length < 2) {
    console.log("  ⚠️ 品牌不足，将创建新品牌...");
    const newBrands = [
      { name: "ABB", slug: "abb", desc: "ABB Group - Power and automation technology" },
      { name: "Siemens", slug: "siemens", desc: "Siemens AG - Industrial automation" },
      { name: "Omron", slug: "omron", desc: "Omron Corporation - Industrial automation and sensing" },
    ];
    
    for (const brand of newBrands) {
      if (!brandIds[brand.slug]) {
        const created = await prisma.brand.create({
          data: {
            brandName: brand.name,
            slug: brand.slug,
            description: brand.desc,
            supplierId: defaultSupplierId,
          },
        });
        brandIds[brand.slug] = created.brandId;
        console.log(`  ✅ 创建品牌: ${brand.name} (${brand.slug})`);
      }
    }
  }

  // ========== 3. 创建供应商 ==========
  const supplier = await prisma.supplier.upsert({
    where: { supplierId: "mock-supplier-001" },
    update: {},
    create: {
      supplierId: "mock-supplier-001",
      supplierName: "Mock Supplier Co.",
      email: "mock@supplier.local",
      passwordHash: "disabled",
      contactInfo: "support@mock-supplier.com",
    },
  });
  console.log(`  ✅ 供应商: ${supplier.supplierName}`);

  // ========== 4. 清空旧产品 ==========
  console.log("\n🗑️  清空旧产品数据...");
  // 先删除关联的报价
  await prisma.supplierQuote.deleteMany({
    where: {
      product: {
        categoryId: { in: Object.values(categoryIds) },
      },
    },
  });
  // 删除产品
  await prisma.product.deleteMany({
    where: {
      categoryId: { in: Object.values(categoryIds) },
    },
  });

  // ========== 5. 创建 Mock 产品数据 ==========
  console.log("\n📦 创建 Mock 产品数据...");

  // 产品配置：类目+品牌+系列+产品列表
  const productConfigs = [
    {
      catSlug: "control",
      brandSlug: "abb",
      series: "ABB Ability",
      seriesDesc: "下一代智能化控制平台",
      products: [
        { name: "PLC Controller AC500", model: "AC500 PM590", desc: "高性能模块化PLC控制器，支持多种通信协议", unit: "台", price: 1280.00 },
        { name: "PLC Controller AC500", model: "AC500 CD522", desc: "紧凑型PLC控制器，适合小型应用", unit: "台", price: 890.00 },
        { name: "扩展模块", model: "AC500 DA501", desc: "数字量输入/输出扩展模块", unit: "个", price: 156.50 },
      ],
    },
    {
      catSlug: "control",
      brandSlug: "abb",
      series: "ABB 800xA",
      seriesDesc: "分布式控制系统",
      products: [
        { name: "DCS控制器", model: "800xA AC800M", desc: "模块化DCS控制器，支持冗余配置", unit: "台", price: 5680.00 },
        { name: "操作员站", model: "800xA PPD510", desc: "高性能操作员工作站", unit: "台", price: 3200.00 },
      ],
    },
    {
      catSlug: "control",
      brandSlug: "siemens",
      series: "S7-1500",
      seriesDesc: "高性能PLC系列",
      products: [
        { name: "CPU模块", model: "6ES7 515-2AM10-0AB0", desc: "CPU 1515-2 PN，集成运动控制", unit: "台", price: 2180.00 },
        { name: "CPU模块", model: "6ES7 517-3AP00-0AB0", desc: "CPU 1517-3 PN/DP，支持PROFINET", unit: "台", price: 3980.00 },
        { name: "通信模块", model: "6ES7 541-1AD00-0AB0", desc: "CM 1541-1 PN通信模块", unit: "个", price: 680.00 },
      ],
    },
    {
      catSlug: "electrical-components",
      brandSlug: "abb",
      series: "AF接触器系列",
      seriesDesc: "新型节能接触器",
      products: [
        { name: "交流接触器", model: "AF09-30-10", desc: "9A三极接触器，220V AC线圈", unit: "个", price: 28.50 },
        { name: "交流接触器", model: "AF16-30-10", desc: "16A三极接触器，230V AC线圈", unit: "个", price: 42.80 },
        { name: "交流接触器", model: "AF38-30-11", desc: "38A三极接触器，带辅助触点", unit: "个", price: 68.00 },
      ],
    },
    {
      catSlug: "electrical-components",
      brandSlug: "siemens",
      series: "SIRIUS系列",
      seriesDesc: "标准电气元件系列",
      products: [
        { name: "断路器", model: "3RV2011-1AA10", desc: "电机保护断路器，1.6A额定电流", unit: "个", price: 85.00 },
        { name: "断路器", model: "3RV2011-4AA10", desc: "电机保护断路器，4A额定电流", unit: "个", price: 92.00 },
      ],
    },
    {
      catSlug: "sensing",
      brandSlug: "omron",
      series: "E2E系列接近开关",
      seriesDesc: "电感式接近开关",
      products: [
        { name: "接近开关", model: "E2E-X10D1-M1GJ", desc: "10mm检测距离，M12螺纹，PNP输出", unit: "个", price: 35.00 },
        { name: "接近开关", model: "E2E-X20D1-M1GJ", desc: "20mm检测距离，M12螺纹，PNP输出", unit: "个", price: 52.00 },
        { name: "接近开关", model: "E2E-X3D1-N", desc: "3mm检测距离，M8螺纹，NPN输出", unit: "个", price: 28.00 },
      ],
    },
    {
      catSlug: "sensing",
      brandSlug: "siemens",
      series: "NAMUR传感器",
      seriesDesc: "NAMUR标准防爆传感器",
      products: [
        { name: "NAMUR接近开关", model: "3RG4011-0AA00", desc: "NAMUR标准，防爆认证", unit: "个", price: 68.00 },
      ],
    },
  ];

  let productCount = 0;
  let quoteCount = 0;

  for (const config of productConfigs) {
    const catId = categoryIds[config.catSlug];
    const brandId = brandIds[config.brandSlug];
    
    if (!catId || !brandId) {
      console.log(`  ⚠️ 跳过 ${config.catSlug}/${config.brandSlug}：缺少类目或品牌ID`);
      continue;
    }

    for (const prod of config.products) {
      // 创建产品
      const product = await prisma.product.create({
        data: {
          categoryId: catId,
          brandId: brandId,
          productName: prod.name,
          model: prod.model,
          series: config.series,
          description: prod.desc,
          unit: prod.unit,
          status: "on_sale",
          sortOrder: 0,
        },
      });
      productCount++;

      // 创建供应商报价
      await prisma.supplierQuote.create({
        data: {
          supplierId: supplier.supplierId,
          productId: product.productId,
          costPrice: prod.price * 0.7, // 成本价70%
          sellPrice: prod.price,
          moq: 1,
          stockStatus: "in_stock",
          isDefault: true,
          isValid: true,
        },
      });
      quoteCount++;
    }
    console.log(`  ✅ ${config.catSlug}/${config.brandSlug} - ${config.series}: ${config.products.length}个产品`);
  }

  console.log(`\n📊 统计: ${productCount} 个产品, ${quoteCount} 个报价`);

  console.log("\n✅ Mock 数据插入完成！");
  console.log("\n🔗 测试路由:");
  console.log("  - 类目视图: /category/control");
  console.log("  - 品牌视图: /abb");
  console.log("  - 组合视图: /category/control/abb");
}

main()
  .catch((e) => {
    console.error("❌ 错误:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
