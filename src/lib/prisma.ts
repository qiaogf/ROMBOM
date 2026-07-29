// @ts-ignore - turbopackIgnore: true - Prisma client is generated outside the app root
import { PrismaClient } from "@/../prisma/generated/client";

declare global {
  var prisma: PrismaClient | undefined;
}

let prismaInstance: PrismaClient;

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    errorFormat: "pretty",
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
