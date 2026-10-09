import { PrismaClient } from "./generated/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  return crypto.scryptSync(password, salt, 64).toString("hex") + ":" + salt;
}

async function main() {
  console.log("🌱 种子数据初始化...");

  const adminEmail = "admin@b2b-store.com";
  const adminPassword = "Admin@12345";
  const adminHash = hashPassword(adminPassword);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: "系统管理员",
      role: "superadmin",
      isActive: true,
    },
  });
  console.log(`✅ 管理员账号: ${admin.email} (${admin.adminId})`);
  console.log(`   密码: ${adminPassword}`);

  const customerEmail = "customer@b2b-store.com";
  const customerPassword = "Customer@123";
  const customerHash = hashPassword(customerPassword);

  const customer = await prisma.customer.upsert({
    where: { email: customerEmail },
    update: {},
    create: {
      email: customerEmail,
      passwordHash: customerHash,
      companyName: "Global Trade Co.",
      contactName: "张三",
      phone: "+86-138-0000-0000",
      taxId: "TAX-1234567890",
      isActive: true,
    },
  });
  console.log(`✅ 客户账号: ${customer.email} (${customer.customerId})`);
  console.log(`   密码: ${customerPassword}`);

  console.log("\n✅ 种子数据初始化完成！");
  console.log("\n📋 账号信息:");
  console.log("  管理员: admin@b2b-store.com / Admin@12345");
  console.log("  客户:   customer@b2b-store.com / Customer@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
