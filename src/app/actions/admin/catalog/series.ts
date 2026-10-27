"use server";

// Series CRUD server actions.

import { prisma } from "@/lib/prisma";
import { resolveCategoryIdForBrand } from "@/lib/db-service";
import { slugify, ensureUniqueSlug } from "./shared";

// ── 创建 Series ──
export async function createSeries(formData: FormData): Promise<{ success: boolean; message: string; seriesId?: string }> {
  const seriesName = (formData.get("seriesName") as string)?.trim();
  const brandId = (formData.get("brandId") as string)?.trim();
  const categoryIdRaw = (formData.get("categoryId") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || undefined;
  const isActive = (formData.get("isActive") as string) !== "false";

  if (!seriesName) return { success: false, message: "Series name is required." };
  if (!brandId) return { success: false, message: "Brand is required." };

  const brand = await prisma.brand.findUnique({ where: { brandId }, select: { brandId: true } });
  if (!brand) return { success: false, message: "Selected brand does not exist." };

  // 品类：优先取表单选择；未选则按品牌主营品类自动解析
  let categoryId = categoryIdRaw || "";
  if (!categoryId) {
    categoryId = (await resolveCategoryIdForBrand(brandId)) || "";
  }
  if (!categoryId) return { success: false, message: "Category is required. Please select a category." };
  const cat = await prisma.category.findUnique({ where: { categoryId }, select: { categoryId: true } });
  if (!cat) return { success: false, message: "Selected category does not exist." };

  try {
    const baseSlug = slugify(seriesName);
    if (!baseSlug) return { success: false, message: "Series name must contain alphanumeric characters." };

    const slug = await ensureUniqueSlug(baseSlug, (w) => prisma.series.findUnique({ where: w, select: { seriesId: true } }));

    const s = await prisma.series.create({
      data: { seriesName, slug, brandId, categoryId, description, isActive },
    });
    // 同步品牌↔品类关联：系列存在即意味着该品牌在该品类下有内容，
    // 前台类目页/品牌页的导航完全依赖 CategoryBrand 关联表
    await prisma.categoryBrand.upsert({
      where: { categoryId_brandId: { categoryId, brandId } },
      update: {},
      create: { categoryId, brandId },
    });
    return { success: true, message: `Series "${seriesName}" created.`, seriesId: s.seriesId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to create series: ${msg}` };
  }
}

// ── 修改 Series（名称 / 品牌 / 品类 / 启用状态）──
export async function updateSeries(formData: FormData): Promise<{ success: boolean; message: string }> {
  const seriesId = (formData.get("seriesId") as string)?.trim();
  const seriesName = (formData.get("seriesName") as string)?.trim();
  const brandIdRaw = (formData.get("brandId") as string)?.trim();
  const categoryIdRaw = (formData.get("categoryId") as string)?.trim();
  const isActiveRaw = (formData.get("isActive") as string)?.trim();

  if (!seriesId) return { success: false, message: "Series ID is required." };

  try {
    const existing = await prisma.series.findUnique({ where: { seriesId } });
    if (!existing) return { success: false, message: "Series not found." };

    const data: {
      seriesName?: string;
      slug?: string;
      brandId?: string;
      categoryId?: string;
      isActive?: boolean;
    } = {};

    // 名称 + slug
    if (seriesName && seriesName !== existing.seriesName) {
      const dup = await prisma.series.findFirst({
        where: { seriesName, NOT: { seriesId } },
        select: { seriesId: true },
      });
      if (dup) return { success: false, message: `Series name "${seriesName}" already exists.` };

      const baseSlug = slugify(seriesName);
      if (!baseSlug) return { success: false, message: "Series name must contain alphanumeric characters." };
      let candidate = baseSlug;
      let i = 2;
      while (await prisma.series.findFirst({ where: { slug: candidate, NOT: { seriesId } }, select: { seriesId: true } })) {
        candidate = `${baseSlug}-${i}`;
        i++;
      }
      data.seriesName = seriesName;
      data.slug = candidate;
    }

    // 品牌
    let brandId = existing.brandId;
    if (brandIdRaw && brandIdRaw !== existing.brandId) {
      const brand = await prisma.brand.findUnique({ where: { brandId: brandIdRaw }, select: { brandId: true } });
      if (!brand) return { success: false, message: "Selected brand does not exist." };
      data.brandId = brandIdRaw;
      brandId = brandIdRaw;
    }

    // 品类：显式传入则校验；未传入时按新品牌自动解析
    let categoryId = existing.categoryId;
    if (categoryIdRaw) {
      const cat = await prisma.category.findUnique({ where: { categoryId: categoryIdRaw }, select: { categoryId: true } });
      if (!cat) return { success: false, message: "Selected category does not exist." };
      if (categoryIdRaw !== existing.categoryId) {
        data.categoryId = categoryIdRaw;
        categoryId = categoryIdRaw;
      }
    } else if (data.brandId) {
      const resolved = (await resolveCategoryIdForBrand(brandId)) || "";
      if (resolved && resolved !== existing.categoryId) {
        data.categoryId = resolved;
        categoryId = resolved;
      }
    }

    // 启用状态
    if (isActiveRaw === "true" || isActiveRaw === "false") {
      data.isActive = isActiveRaw === "true";
    }

    if (Object.keys(data).length === 0) {
      return { success: true, message: "No changes." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.series.update({ where: { seriesId }, data });
      // 同步品牌↔品类关联
      await tx.categoryBrand.upsert({
        where: { categoryId_brandId: { categoryId, brandId } },
        update: {},
        create: { categoryId, brandId },
      });
      // 防御：categoryId 变更时同步该系列下所有旧 Product 的 categoryId
      // 避免 Product.categoryId 与 Series.categoryId 不一致（如 SIMATIC HMI 误入 Process Control）
      if (data.categoryId && data.categoryId !== existing.categoryId) {
        await tx.product.updateMany({
          where: {
            brandId: existing.brandId,
            series: existing.seriesName,
          },
          data: { categoryId: data.categoryId },
        });
      }
      // 防御：seriesName 变更时同步旧 Product.series 文本
      if (data.seriesName && data.seriesName !== existing.seriesName) {
        await tx.product.updateMany({
          where: {
            brandId: existing.brandId,
            series: existing.seriesName,
          },
          data: { series: data.seriesName },
        });
      }
    });
    return { success: true, message: "Series updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update series: ${msg}` };
  }
}

// ── 删除系列（级联型号价格；若品牌在该品类下再无系列则同步移除 CategoryBrand 关联）──
export async function deleteSeries(formData: FormData): Promise<{ success: boolean; message: string }> {
  const seriesId = (formData.get("seriesId") as string)?.trim();
  if (!seriesId) return { success: false, message: "Series ID is required." };

  try {
    await prisma.$transaction(async (tx) => {
      const series = await tx.series.findUnique({
        where: { seriesId },
        select: { seriesId: true, brandId: true, categoryId: true },
      });
      if (!series) throw new Error("Series not found.");

      // 1. 型号价格（CartItem / SalesOrderItem 引用为可选，SET NULL；订单内价格快照保留）
      await tx.modelPrice.deleteMany({ where: { seriesId } });
      // 2. 系列本身
      await tx.series.delete({ where: { seriesId } });
      // 3. 同品牌同品类下已无其他系列 → 移除 CategoryBrand 关联，前台导航自动同步
      const remaining = await tx.series.count({
        where: { brandId: series.brandId, categoryId: series.categoryId },
      });
      if (remaining === 0) {
        await tx.categoryBrand.deleteMany({
          where: { brandId: series.brandId, categoryId: series.categoryId },
        });
      }
    });
    return { success: true, message: "Series deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete series: ${msg}` };
  }
}
