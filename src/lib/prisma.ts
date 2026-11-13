import { PrismaClient } from "@/../prisma/generated/client";

declare global {
  var prisma: PrismaClient | undefined;
}

let prismaInstance: PrismaClient;

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    errorFormat: "pretty",
    // Neon 经本地中继跨境访问，交互式事务默认 5s 很容易超时（P2028），放宽等待与执行上限
    transactionOptions: {
      maxWait: 10_000,
      timeout: 30_000,
    },
  });
}

if (process.env.NODE_ENV === "production") {
  prismaInstance = createPrismaClient();
} else {
  if (!globalThis.prisma) {
    globalThis.prisma = createPrismaClient();
  }
  prismaInstance = globalThis.prisma;
}

export const prisma = prismaInstance;

export default prisma;
