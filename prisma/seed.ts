import { PrismaClient } from "./generated/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return crypto.scryptSync(password, salt, 64).toString("hex") + ":" + salt;
}

async function main() {
  console.log("Seeding database...");

  const hashedPassword = hashPassword("Test@12345");

  const user = await prisma.user.upsert({
    where: { email: "admin@globalshop.com" },
    update: {},
    create: {
      email: "admin@globalshop.com",
      passwordHash: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      country: "CN",
      currency: "USD",
      phone: "+86-138-0000-0000",
      role: "ADMIN",
    },
  });
  console.log("User created:", user.email);

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "electronics" },
      update: {},
      create: { name: "Electronics", nameEn: "Electronics", slug: "electronics", sortOrder: 1, imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop" },
    }),
    prisma.category.upsert({
      where: { slug: "home-living" },
      update: {},
      create: { name: "Home & Living", nameEn: "Home & Living", slug: "home-living", sortOrder: 2, imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop" },
    }),
    prisma.category.upsert({
      where: { slug: "fashion-accessories" },
      update: {},
      create: { name: "Fashion & Accessories", nameEn: "Fashion & Accessories", slug: "fashion-accessories", sortOrder: 3, imageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop" },
    }),
    prisma.category.upsert({
      where: { slug: "beauty-skincare" },
      update: {},
      create: { name: "Beauty & Skincare", nameEn: "Beauty & Skincare", slug: "beauty-skincare", sortOrder: 4, imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop" },
    }),
    prisma.category.upsert({
      where: { slug: "sports-outdoors" },
      update: {},
      create: { name: "Sports & Outdoors", nameEn: "Sports & Outdoors", slug: "sports-outdoors", sortOrder: 5, imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop" },
    }),
  ]);
  console.log("Categories created:", categories.length);

  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const products = [
    {
      sku: "ELEC-001", name: "Wireless Bluetooth Earbuds", nameEn: "Wireless Bluetooth Earbuds",
      description: "高品质无线蓝牙耳机，主动降噪，续航30小时",
      descriptionEn: "High-quality wireless earbuds with active noise cancellation and 30-hour battery life",
      price: 49.99, originalPrice: 79.99, stock: 256, country: "CN", weight: 0.05, weightUnit: "kg",
      featured: true, categorySlug: "electronics", images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop"],
      ratingAverage: 4.5, ratingCount: 256, salesCount: 1024,
    },
    {
      sku: "ELEC-002", name: "Smart Watch Pro", nameEn: "Smart Watch Pro",
      description: "智能手表，心率监测，GPS定位，支持100+运动模式",
      descriptionEn: "Smart watch with heart rate monitoring, GPS, and 100+ sport modes",
      price: 199.99, originalPrice: 249.99, stock: 189, country: "CN", weight: 0.15, weightUnit: "kg",
      featured: true, categorySlug: "electronics", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop"],
      ratingAverage: 4.3, ratingCount: 189, salesCount: 756,
    },
    {
      sku: "ELEC-003", name: "Mechanical Gaming Keyboard", nameEn: "Mechanical Gaming Keyboard",
      description: "RGB机械游戏键盘，红轴，全键无冲",
      descriptionEn: "RGB mechanical gaming keyboard with red switches and full N-key rollover",
      price: 89.99, originalPrice: 119.99, stock: 134, country: "CN", weight: 0.85, weightUnit: "kg",
      featured: true, categorySlug: "electronics", images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop"],
      ratingAverage: 4.7, ratingCount: 134, salesCount: 567,
    },
    {
      sku: "ELEC-004", name: "Portable Power Bank 20000mAh", nameEn: "Portable Power Bank 20000mAh",
      description: "大容量移动电源，PD快充，可充笔记本",
      descriptionEn: "High-capacity power bank with PD fast charging for laptops",
      price: 39.99, originalPrice: 59.99, stock: 210, country: "CN", weight: 0.45, weightUnit: "kg",
      featured: false, categorySlug: "electronics", images: ["https://images.unsplash.com/photo-1609592806596-b43bada2f4c8?w=600&h=600&fit=crop"],
      ratingAverage: 4.4, ratingCount: 210, salesCount: 2100,
    },
    {
      sku: "HOME-001", name: "Ceramic Dinnerware Set", nameEn: "Ceramic Dinnerware Set",
      description: "陶瓷餐具套装，16件套，精美花纹",
      descriptionEn: "Ceramic dinnerware set, 16 pieces with elegant patterns",
      price: 79.99, originalPrice: 99.99, stock: 98, country: "CN", weight: 4.5, weightUnit: "kg",
      featured: true, categorySlug: "home-living", images: ["https://images.unsplash.com/photo-1603199506016-b9a594b593c0?w=600&h=600&fit=crop"],
      ratingAverage: 4.6, ratingCount: 98, salesCount: 345,
    },
    {
      sku: "HOME-002", name: "Memory Foam Pillow", nameEn: "Memory Foam Pillow",
      description: "记忆棉枕头，颈椎舒适，慢回弹",
      descriptionEn: "Memory foam pillow with cervical support and slow rebound",
      price: 45.99, originalPrice: 65.99, stock: 167, country: "CN", weight: 0.8, weightUnit: "kg",
      featured: false, categorySlug: "home-living", images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=600&fit=crop"],
      ratingAverage: 4.2, ratingCount: 167, salesCount: 432,
    },
    {
      sku: "HOME-003", name: "Scented Soy Candle Set", nameEn: "Scented Soy Candle Set",
      description: "天然大豆蜡香薰蜡烛礼盒，3种香型",
      descriptionEn: "Natural soy wax scented candle gift set, 3 fragrances",
      price: 29.99, originalPrice: 39.99, stock: 223, country: "CN", weight: 0.6, weightUnit: "kg",
      featured: false, categorySlug: "home-living", images: ["https://images.unsplash.com/photo-1602874801006-e26c5e7b8e2f?w=600&h=600&fit=crop"],
      ratingAverage: 4.8, ratingCount: 223, salesCount: 890,
    },
    {
      sku: "FASH-001", name: "Silk Scarf", nameEn: "Silk Scarf",
      description: "真丝围巾，手工印染，多种配色",
      descriptionEn: "Silk scarf with hand-dyed prints in multiple colors",
      price: 59.99, originalPrice: 89.99, stock: 67, country: "CN", weight: 0.1, weightUnit: "kg",
      featured: true, categorySlug: "fashion-accessories", images: ["https://images.unsplash.com/photo-1601762603339-fd61e28b698a?w=600&h=600&fit=crop"],
      ratingAverage: 4.5, ratingCount: 67, salesCount: 234,
    },
    {
      sku: "FASH-002", name: "Classic Baseball Cap", nameEn: "Classic Baseball Cap",
      description: "经典棒球帽，纯棉，可调节",
      descriptionEn: "Classic baseball cap in 100% cotton with adjustable strap",
      price: 24.99, originalPrice: 34.99, stock: 245, country: "CN", weight: 0.15, weightUnit: "kg",
      featured: false, categorySlug: "fashion-accessories", images: ["https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop"],
      ratingAverage: 4.3, ratingCount: 245, salesCount: 678,
    },
    {
      sku: "FASH-003", name: "Genuine Leather Wallet", nameEn: "Genuine Leather Wallet",
      description: "真皮钱包，多卡位，RFID防扫描",
      descriptionEn: "Genuine leather wallet with multiple card slots and RFID protection",
      price: 49.99, originalPrice: 69.99, stock: 189, country: "CN", weight: 0.15, weightUnit: "kg",
      featured: false, categorySlug: "fashion-accessories", images: ["https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&h=600&fit=crop"],
      ratingAverage: 4.6, ratingCount: 189, salesCount: 512,
    },
    {
      sku: "BEAUT-001", name: "Hyaluronic Acid Serum", nameEn: "Hyaluronic Acid Serum",
      description: "玻尿酸精华液，深层保湿，适合所有肤质",
      descriptionEn: "Hyaluronic acid serum for deep hydration, suitable for all skin types",
      price: 35.99, originalPrice: 49.99, stock: 567, country: "CN", weight: 0.1, weightUnit: "kg",
      featured: true, categorySlug: "beauty-skincare", images: ["https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=600&fit=crop"],
      ratingAverage: 4.8, ratingCount: 567, salesCount: 2345,
    },
    {
      sku: "BEAUT-002", name: "Amino Acid Cleanser", nameEn: "Amino Acid Cleanser",
      description: "氨基酸洁面乳，温和不刺激",
      descriptionEn: "Amino acid facial cleanser, gentle and non-irritating",
      price: 19.99, originalPrice: 29.99, stock: 789, country: "CN", weight: 0.12, weightUnit: "kg",
      featured: true, categorySlug: "beauty-skincare", images: ["https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&h=600&fit=crop"],
      ratingAverage: 4.7, ratingCount: 789, salesCount: 3456,
    },
    {
      sku: "BEAUT-003", name: "Sunscreen SPF50+", nameEn: "Sunscreen SPF50+",
      description: "广谱防晒霜，防水防汗",
      descriptionEn: "Broad-spectrum sunscreen SPF50+, waterproof and sweat-resistant",
      price: 22.99, originalPrice: 32.99, stock: 432, country: "CN", weight: 0.15, weightUnit: "kg",
      featured: false, categorySlug: "beauty-skincare", images: ["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop"],
      ratingAverage: 4.5, ratingCount: 432, salesCount: 1890,
    },
    {
      sku: "SPRT-001", name: "Running Shoes Ultra", nameEn: "Running Shoes Ultra",
      description: "超轻跑鞋，透气网面，缓震中底",
      descriptionEn: "Ultra-light running shoes with breathable mesh and cushioned midsole",
      price: 89.99, originalPrice: 129.99, stock: 278, country: "CN", weight: 0.3, weightUnit: "kg",
      featured: true, categorySlug: "sports-outdoors", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop"],
      ratingAverage: 4.6, ratingCount: 278, salesCount: 890,
    },
    {
      sku: "SPRT-002", name: "Yoga Mat Premium", nameEn: "Yoga Mat Premium",
      description: "TPE瑜伽垫，防滑，环保材料",
      descriptionEn: "Premium TPE yoga mat, non-slip, eco-friendly material",
      price: 34.99, originalPrice: 49.99, stock: 234, country: "CN", weight: 1.5, weightUnit: "kg",
      featured: true, categorySlug: "sports-outdoors", images: ["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop"],
      ratingAverage: 4.7, ratingCount: 234, salesCount: 780,
    },
    {
      sku: "SPRT-003", name: "Sports Water Bottle", nameEn: "Sports Water Bottle",
      description: "运动水杯，保温24小时，BPA-free",
      descriptionEn: "Insulated sports water bottle, 24-hour cold retention, BPA-free",
      price: 15.99, originalPrice: 22.99, stock: 345, country: "CN", weight: 0.25, weightUnit: "kg",
      featured: false, categorySlug: "sports-outdoors", images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop"],
      ratingAverage: 4.4, ratingCount: 345, salesCount: 1230,
    },
  ];

  for (const p of products) {
    const catId = catMap[p.categorySlug];
    if (!catId) { console.log(`Skip ${p.sku}: category not found`); continue; }
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku, name: p.name, nameEn: p.nameEn,
        description: p.description, descriptionEn: p.descriptionEn,
        price: p.price, originalPrice: p.originalPrice,
        stock: p.stock, country: p.country,
        weight: p.weight, weightUnit: p.weightUnit,
        featured: p.featured, categoryId: catId,
        images: p.images, thumbnail: p.images[0],
        ratingAverage: p.ratingAverage, ratingCount: p.ratingCount,
        salesCount: p.salesCount,
      },
    });
  }
  console.log("Products created:", products.length);

  const allProducts = await prisma.product.findMany({ where: { isActive: true } });
  for (const product of allProducts) {
    for (let i = 1; i <= 3; i++) {
      await prisma.review.upsert({
        where: { productId_userId: { productId: product.id, userId: user.id } },
        update: {},
        create: {
          productId: product.id, userId: user.id,
          rating: Math.floor(Math.random() * 2) + 4,
          title: `Review ${i} for ${product.nameEn}`,
          titleEn: `Review ${i} for ${product.nameEn}`,
          comment: `Great product! Very satisfied with the quality and fast shipping. Will buy again.`,
          commentEn: `Great product! Very satisfied with the quality and fast shipping. Will buy again.`,
          isApproved: true, isVerified: true,
        },
      });
    }
  }
  console.log("Reviews created");

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());