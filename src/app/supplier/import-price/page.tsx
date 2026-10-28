import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSupplierSession } from "@/lib/auth-admin";
import { SupplierImportPanel } from "./SupplierImportPanel";
import { PurchaseOrderPanel } from "./PurchaseOrderPanel";
import { BatchItemsTable } from "./_components/BatchItemsTable";
import { getBatchDetailViewData, getListData } from "./_data/supplier-import-data";
import { toStr } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function SupplierImportPricePage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string | string[] }>;
}) {
  const session = await getSupplierSession();
  if (!session) redirect("/auth/supplier-login");

  const sp = await searchParams;
  const batchId = toStr(sp.batch);

  // 批次详情视图：左半显示详情，右半保持 Purchase Order 列表
  if (batchId) {
    const detail = await getBatchDetailViewData(batchId, session.supplierId);
    if (!detail) redirect("/supplier/import-price");
    const { batch, stagedItems, itemSeriesMap, purchaseItems } = detail;

    return (
      <>
        {/* 左侧：批次详情 (1/2)，内容超长时该区域独立滚动 */}
        <section className="w-1/2 min-w-0 min-h-0 flex flex-col border-r border-slate-200 bg-white overflow-y-auto">
          <div className="p-2.5">
            <Link
              href="/supplier/import-price"
              className="inline-flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-800 mb-1.5"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Import Price
            </Link>

            <h1 className="text-[13px] font-semibold text-slate-800 leading-tight break-words">{batch.fileName}</h1>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-500 mb-2 leading-tight">
              <span>{batch.importedAt.toLocaleString()}</span>
              <span className="text-slate-300">|</span>
              <span className={`px-1 py-0.5 rounded text-[9px] font-medium capitalize ${
                batch.approvalStatus === "pending"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}>
                {batch.approvalStatus === "pending" ? "Pending" : "Live"}
              </span>
              {batch.approvedAt && (
                <>
                  <span className="text-slate-300">|</span>
                  <span>Live since {batch.approvedAt.toLocaleString()}</span>
                </>
              )}
              <span className="text-slate-300">|</span>
              <span>{batch.recordCount} records</span>
              {batch.errorCount > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-rose-600">{batch.errorCount} errors</span>
                </>
              )}
            </div>

            <BatchItemsTable stagedItems={stagedItems} itemSeriesMap={itemSeriesMap} />
          </div>
        </section>

        {/* 右侧：Purchase Order (1/2)，内部独立滚动 */}
        <section className="w-1/2 min-w-0 min-h-0 flex flex-col bg-slate-50">
          <PurchaseOrderPanel items={purchaseItems} />
        </section>
      </>
    );
  }

  // 列表视图
  const { myBatches, purchaseItems } = await getListData(session.supplierId);

  return (
    <>
      {/* 左侧：Import Price (1/2)，文件列表内部独立滚动 */}
      <section className="w-1/2 min-w-0 min-h-0 flex flex-col border-r border-slate-200 bg-white">
        <SupplierImportPanel
          batches={myBatches.map((b) => ({
            importBatchId: b.importBatchId,
            fileName: b.fileName,
            importedAt: b.importedAt,
            recordCount: b.recordCount,
            errorCount: b.errorCount,
            approvalStatus: b.approvalStatus,
            approvedAt: b.approvedAt,
            series: b.series,
          }))}
          emptyHint="You have not uploaded any files yet. Upload a file above."
        />
      </section>

      {/* 右侧：Purchase Order (1/2)，订单列表内部独立滚动 */}
      <section className="w-1/2 min-w-0 min-h-0 flex flex-col bg-slate-50">
        <PurchaseOrderPanel items={purchaseItems} />
      </section>
    </>
  );
}
