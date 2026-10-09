"use server";

// Category CRUD server actions.

import { prisma } from "@/lib/prisma";
import { slugify, ensureUniqueSlug } from "./shared";

// ── 创建 Category ──
export async function createCategory(formData: FormData): Promise<{ success: boolean; message: string; categoryId?: string }> {
  const categoryName = (formData.get("categoryName") as string)?.trim();
  const parentId = (formData.get("parentId") as string)?.trim() || "0";
  const briefDesc = (formData.get("briefDesc") as string)?.trim() || undefined;
  const isActive = (formData.get("isActive") as string) !== "false";

  if (!categoryName) return { success: false, message: "Category name is required." };

  try {
    // 计算 level：顶级=1，子级=父级 level+1
    let level = 1;
    if (parentId && parentId !== "0") {
      const parent = await prisma.category.findUnique({ where: { categoryId: parentId }, select: { level: true } });
      if (!parent) return { success: false, message: "Parent category not found." };
      level = parent.level + 1;
    }

    const baseSlug = slugify(categoryName);
    if (!baseSlug) return { success: false, message: "Category name must contain alphanumeric characters." };

    const slug = await ensureUniqueSlug(baseSlug, (w) => prisma.category.findUnique({ where: w, select: { categoryId: true } }));

    const cat = await prisma.category.create({
      data: { categoryName, slug, parentId, level, briefDesc, isActive },
    });
    return { success: true, message: `Category "${categoryName}" created.`, categoryId: cat.categoryId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to create category: ${msg}` };
  }
}

// ── 删除 Category ──
export async function deleteCategory(formData: FormData): Promise<{ success: boolean; message: string }> {
  const categoryId = (formData.get("categoryId") as string)?.trim();
  if (!categoryId) return { success: false, message: "Category ID is required." };

  try {
    await prisma.$transaction(async (tx) => {
      // 检查是否有子类目
      const childCount = await tx.category.count({ where: { parentId: categoryId } });
      if (childCount > 0) {
        throw new Error(`Cannot delete: ${childCount} sub-category(ies) still exist. Delete or reassign them first.`);
      }
      // 检查是否有关联品牌
      const cbCount = await tx.categoryBrand.count({ where: { categoryId } });
      if (cbCount > 0) {
        throw new Error(`Cannot delete: ${cbCount} brand(s) are linked to this category. Unlink them first.`);
      }
      // 检查是否有产品（Product.categoryId 外键 RESTRICT）
      const productCount = await tx.product.count({ where: { categoryId } });
      if (productCount > 0) {
        throw new Error(`Cannot delete: ${productCount} product(s) belong to this category. Reassign them first.`);
      }
      // Series.categoryId 外键 Restrict
      const seriesCount = await tx.series.count({ where: { categoryId } });
      if (seriesCount > 0) {
        throw new Error(`Cannot delete: ${seriesCount} series still belong to this category. Reassign them first.`);
      }
      await tx.category.delete({ where: { categoryId } });
    });
    return { success: true, message: "Category deleted." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to delete category: ${msg}` };
  }
}

// ── 修改 Category（名称 / 父级 / 启用状态）──
export async function updateCategory(formData: FormData): Promise<{ success: boolean; message: string }> {
  const categoryId = (formData.get("categoryId") as string)?.trim();
  const categoryName = (formData.get("categoryName") as string)?.trim();
  const parentIdRaw = (formData.get("parentId") as string)?.trim();
  const isActiveRaw = (formData.get("isActive") as string)?.trim();

  if (!categoryId) return { success: false, message: "Category ID is required." };

  try {
    const existing = await prisma.category.findUnique({ where: { categoryId } });
    if (!existing) return { success: false, message: "Category not found." };

    const data: {
      categoryName?: string;
      slug?: string;
      parentId?: string;
      level?: number;
      isActive?: boolean;
    } = {};

    // 名称 + slug
    if (categoryName && categoryName !== existing.categoryName) {
      const dup = await prisma.category.findFirst({
        where: { categoryName, NOT: { categoryId } },
        select: { categoryId: true },
      });
      if (dup) return { success: false, message: `Category name "${categoryName}" already exists.` };

      const baseSlug = slugify(categoryName);
      if (!baseSlug) return { success: false, message: "Category name must contain alphanumeric characters." };
      let candidate = baseSlug;
      let i = 2;
      while (await prisma.category.findFirst({ where: { slug: candidate, NOT: { categoryId } }, select: { categoryId: true } })) {
        candidate = `${baseSlug}-${i}`;
        i++;
      }
      data.categoryName = categoryName;
      data.slug = candidate;
    }

    // 父级（防自引用 / 防循环）
    if (parentIdRaw !== undefined) {
      const parentId = parentIdRaw || "0";
      if (parentId !== "0") {
        if (parentId === categoryId) {
          return { success: false, message: "A category cannot be its own parent." };
        }
        // 沿候选父级链向上查找，若遇到自身则构成循环
        let cursor: string | null = parentId;
        const seen = new Set<string>();
        while (cursor && cursor !== "0") {
          if (cursor === categoryId) {
            return { success: false, message: "Cannot select a sub-category as parent (would create a loop)." };
          }
          if (seen.has(cursor)) break;
          seen.add(cursor);
          const node: { parentId: string } | null = await prisma.category.findUnique({ where: { categoryId: cursor }, select: { parentId: true } });
          cursor = node?.parentId ?? null;
        }
        const parent = await prisma.category.findUnique({ where: { categoryId: parentId }, select: { level: true } });
        if (!parent) return { success: false, message: "Parent category not found." };
        if (parentId !== existing.parentId) {
          data.parentId = parentId;
          data.level = parent.level + 1;
        }
      } else if (existing.parentId !== "0") {
        data.parentId = "0";
        data.level = 1;
      }
    }

    // 启用状态
    if (isActiveRaw === "true" || isActiveRaw === "false") {
      data.isActive = isActiveRaw === "true";
    }

    if (Object.keys(data).length === 0) {
      return { success: true, message: "No changes." };
    }

    await prisma.category.update({ where: { categoryId }, data });
    return { success: true, message: "Category updated." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to update category: ${msg}` };
  }
}
