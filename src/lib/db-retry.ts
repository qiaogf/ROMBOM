// 数据库瞬时故障重试：中继抖动 / Neon 冷启动时，单次查询常报 P1001 / P1017 / P2024。
// 这里统一做一次短暂重试，避免把可恢复的抖动当成"订单不存在"或"空列表"暴露给用户。

import { Prisma } from "@/../prisma/generated/client";

const TRANSIENT_CODES = new Set(["P1000", "P1001", "P1002", "P1008", "P1017", "P2024"]);

/** 判断是否为可重试的瞬时连接类错误 */
export function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_CODES.has(error.code);
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Can't reach database server|Server has closed the connection|Timed out fetching a new connection|Connection terminated|ECONNRESET|ETIMEDOUT/i.test(
    message
  );
}

/**
 * 执行一次数据库调用，瞬时错误时重试（默认重试 1 次，间隔 300ms）。
 * 非瞬时错误或重试耗尽后向上抛出，交由页面决定展示"暂时不可用"。
 */
export async function withDbRetry<T>(
  run: () => Promise<T>,
  retries = 1,
  delayMs = 300
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retries || !isTransientDbError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
