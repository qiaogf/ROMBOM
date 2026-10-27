"use server";

// Brand CRUD server actions.

import { prisma } from "@/lib/prisma";
import { slugify, ensureUniqueSlug, invalidateCatalogCache } from "./shared";

// ── 创建 Brand ──
export async function createBrand(formData: FormData): Promise<{ success: boolean; message: string; brandId?: string }> {
  const brandName = (formData.get("brandName") as string)?.trim();
  const supplierIdRaw = (formData.get("supplierId") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || undefined;
  const isActive = (formData.get("isActive") as string) !== "false";

  if (!brandName) return { success: false, message: "Brand name is required." };

  // 供应商为可选归属：填写才校验，留空则品牌无归属供应商
  let supplierId: string | null = null;
  if (supplierIdRaw) {
    const supplier = await prisma.supplier.findUnique({ where: { supplierId: supplierIdRaw }, select: { supplierId: true } });
    if (!supplier) return { success: false, message: "Selected supplier does not exist." };
    supplierId = supplierIdRaw;
  }

  try {
    const baseSlug = slugify(brandName);
    if (!baseSlug) return { success: false, message: "Brand name must contain alphanumeric characters." };

    const slug = await ensureUniqueSlug(baseSlug, (w) => prisma.brand.findUnique({ where: w, select: { brandId: true } }));

    const brand = await prisma.brand.create({
      data: { brandName, slug, supplierId, description, isActive },
    });
    await invalidateCatalogCache();
    return { success: true, message: `Brand "${brandName}" created.`, brandId: brand.brandId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to create brand: ${msg}` };
  }
}

// ── 修改 Brand（名称 / 供应商 / 启用状态）──
export async function updateBrand(formData: FormData): Promise<{ success: boolean; message: string }> {
  const brandId = (formData.get("brandId") as string)?.trim();
  const brandName = (formData.get("brandName") as string)?.trim();
  const supplierId = (formData.get("supplierId") as string)?.trim();
  const isActiveRaw = (formData.get("isActive") as string)?.trim();
  const sortOrderRaw = (formData.get("sortOrder") as string)?.trim();

  if (!brandId) return { success: false, message: "Brand ID is required." };

  try {
    const existing = await prisma.brand.findUnique({ where: { brandId } });
    if (!existing) return { success: false, message: "Brand not found." };

    const data: {
      brandName?: string;
      slug?: string;
      supplierId?: string;
      isActive?: boolean;
      sortOrder?: number;
    } = {};

    // 名称
    if (brandName && brandName !== existing.brandName) {
      // 重名检查（排除自身）
      const dup = await prisma.brand.findFirst({
        where: { brandName, NOT: { brandId } },
        select: { brandId: true },
      });
      if (dup) return { success: false, message: `Brand name "${brandName}" already exists.` };

      data.brandName = brandName;
      // 同步重新生成 slug（排除自身，重名追加 -2/-3）
      const baseSlug = slugify(brandName);
      if (!baseSlug) return { success: false, message: "Brand name must contain alphanumeric characters." };
      let candidate = baseSlug;
      let i = 2;
      while (await prisma.brand.findFirst({ where: { slug: candidate, NOT: { brandId } }, select: { brandId: true } })) {
        candidate = `${baseSlug}-${i}`;
        i++;
      }
      data.slug = candidate;
    }

    // 供应商
    if (supplierId && supplierId !== existing.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { supplierId }, select: { supplierId: true } });
      if (!supplier) return { success: false, message: "Selected supplier does not exist." };
      data.supplierId = supplierId;
    }

    // 启用状态
    if (isActiveRaw === "true" || isActiveRaw === "false") {
      data.isActive = isActiveRaw === "true";
    }

    // 排序值（整数，可改）
    if (sortOrderRaw !== undefined && sortOrderRaw !== "") {
      const n = Number.parseInt(sortOrderRaw, 10);
      if (!Number.isFinite(n)) return { success: false, message: "Sort order must be a whole number." };
      if (n !== existing.sortOrder) data.sortOrder = n;
    }

    if (Object.keys(data).length === 0) {
      return { success: true, message: "No changes." };
    }

    await prisma.brand.update({ where: { brandId }, data });
    await invalidateCatalogCache();
    return { success: true, message: `Brand updated.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update brand: ${msg}` };
  }
}

// ── 删除品牌（深级联：型号价格/系列/旧Product/品类关联）──
export async function deleteBrand(formData: FormData): Promise<{ success: boolean; message: string }> {
  const brandId = (formData.get("brandId") as string)?.trim();
  if (!brandId) return { success: false, message: "Brand ID is required." };

  try {
    await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.findUnique({
        where: { brandId },
        select: { brandId: true, brandName: true, series: { select: { seriesId: true } } },
      });
      if (!brand) throw new Error("Brand not found.");
      const seriesIds = brand.series.map((s) => s.seriesId);

      // 1. 旧报价（SupplierQuote.productId RESTRICT；购物车/订单项引用为可选 SET NULL）
      await tx.supplierQuote.deleteMany({ where: { product: { brandId } } });
      // 2. 型号价格（含无系列行：直接按 brandId 归属；系列级仍先显式删除解除 Supplier 侧 RESTRICT）
      if (seriesIds.length > 0) {
        await tx.modelPrice.deleteMany({ where: { seriesId: { in: seriesIds } } });
      }
      await tx.modelPrice.deleteMany({ where: { brandId } });
      // 3. 旧 Product 表数据（Product.brandId RESTRICT）
      await tx.product.deleteMany({ where: { brandId } });
      // 4. 品类-品牌关联（CategoryBrand.brandId 本为 CASCADE，显式删除保持清晰）
      await tx.categoryBrand.deleteMany({ where: { brandId } });
      // 5. 系列（型号价格已删；Series.brandId 本为 CASCADE）
      await tx.series.deleteMany({ where: { brandId } });
      // 6. 品牌本身
      await tx.brand.delete({ where: { brandId } });
    });
    await invalidateCatalogCache();
    return { success: true, message: "Brand deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete brand: ${msg}` };
  }
}
