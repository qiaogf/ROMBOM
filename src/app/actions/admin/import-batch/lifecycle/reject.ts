"use server";

// Reject (cancel) a pending import batch — deletes the batch and its staged rows.
// approved batches cannot be rejected (use delete instead, which rolls back live data).

import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-admin";

// ── 管理员拒绝（驳回）待确认批次 ──
// 删除 pending 批次及其 ImportBatchItem 暂存行；approved 批次不允许拒绝，请用删除。
export async function rejectImportBatch(formData: FormData): Promise<{ success: boolean; message: string }> {
  const importBatchId = (formData.get("importBatchId") as string)?.trim();
  if (!importBatchId) return { success: false, message: "Import batch ID is required." };

  const session = await getAdminSession();
  if (!session) return { success: false, message: "Unauthorized. Admin login required." };

  try {
    const batch = await prisma.importBatch.findUnique({
      where: { importBatchId },
      select: { approvalStatus: true, fileName: true },
    });
    if (!batch) return { success: false, message: "Import batch not found." };
    if (batch.approvalStatus === "approved") {
      return { success: false, message: "This batch is already approved. Use delete to remove it." };
    }
    // ImportBatchItem 由 onDelete: Cascade 自动清理
    await prisma.importBatch.delete({ where: { importBatchId } });
    return { success: true, message: `Pending batch "${batch.fileName}" rejected and removed.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Failed to reject batch: ${msg}` };
  }
}
