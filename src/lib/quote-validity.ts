/**
 * 报价有效期工具
 *
 * 规则：
 *  - 单条供应商报价有效时长 = 5 个工作日（不含周六/周日）
 *  - 到期未上传新报价覆盖 → 自动失效，不再参与比价与前台展示
 *  - 特殊类目（导航名含 <> / ()）直接上线、不进比价池，不设有效期
 */

import { prisma } from "@/lib/prisma";

/** 从 from 起往后推 n 个工作日（跳过周六、周日），返回当天 23:59:59.999 */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay(); // 0=周日 6=周六
    if (dow !== 0 && dow !== 6) added++;
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

/** 报价有效期截止时间 = 上传日 + 5 个工作日 */
export function computeQuoteValidUntil(from: Date = new Date()): Date {
  return addBusinessDays(from, 5);
}

/**
 * 清扫已过期报价：
 *  - ModelPrice.validUntil < now 且仍 on_sale → 置 off_sale（不再展示、不参与比价）
 *  - SupplierQuote.validUntil < now 且仍 isValid → 置 isValid=false
 * 只处理设置了 validUntil 的行；特殊类目 validUntil=null 不受影响。
 */
export async function expireStaleQuotes(now: Date = new Date()): Promise<{
  modelsExpired: number;
  quotesExpired: number;
  categorySlugs: string[];
  brandSlugs: string[];
}> {
  // 先记录即将失效行所属类目/品牌，供调用方精准失效缓存（不清全站）
  const expiring = await prisma.modelPrice.findMany({
    where: { validUntil: { not: null, lt: now }, status: "on_sale" },
    select: {
      category: { select: { slug: true } },
      series: { select: { brand: { select: { slug: true } } } },
    },
  });
  const categorySlugs = Array.from(
    new Set(expiring.map((r) => r.category?.slug).filter((s): s is string => Boolean(s))),
  );
  const brandSlugs = Array.from(
    new Set(expiring.map((r) => r.series?.brand?.slug).filter((s): s is string => Boolean(s))),
  );

  const [models, quotes] = await prisma.$transaction([
    prisma.modelPrice.updateMany({
      where: { validUntil: { not: null, lt: now }, status: "on_sale" },
      data: { status: "off_sale" },
    }),
    prisma.supplierQuote.updateMany({
      where: { validUntil: { not: null, lt: now }, isValid: true },
      data: { isValid: false },
    }),
  ]);
  return { modelsExpired: models.count, quotesExpired: quotes.count, categorySlugs, brandSlugs };
}
