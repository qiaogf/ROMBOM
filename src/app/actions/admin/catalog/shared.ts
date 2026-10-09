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
