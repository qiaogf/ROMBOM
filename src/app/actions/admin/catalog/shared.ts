// Shared helpers for catalog mutation sub-modules (NOT a server-action module:
// exports sync helpers, so must not carry "use server").

// ── 工具：slugify ──
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 确保 slug 唯一（针对任意表的 slug 字段）
export async function ensureUniqueSlug(
  baseSlug: string,
  findUnique: (where: { slug: string }) => Promise<unknown>,
): Promise<string> {
  let candidate = baseSlug;
  let i = 2;
  while (await findUnique({ slug: candidate })) {
    candidate = `${baseSlug}-${i}`;
    i++;
  }
  return candidate;
}

// ── 目录数据变更后失效前台缓存 ──
// 前台侧边栏/分类页数据走 unstable_cache（tag "catalog" + 1h revalidate），
// 任何 Brand/Category/Series 增删改后必须调用，否则前台最长 1 小时看不到变更
export async function invalidateCatalogCache(): Promise<void> {
  const { revalidatePath, revalidateTag } = await import("next/cache");
  revalidateTag("catalog", { expire: 0 });
  revalidatePath("/", "layout");
}
