// Server-side data fetching for /admin/admin-user
// Extracted from page.tsx (Phase 18) — pure data assembly, no behavior change.

import { prisma } from "@/lib/prisma";

export async function getAdminUserList() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
  });
}
