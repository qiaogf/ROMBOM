import { Download } from "lucide-react";
import { getAdminSession } from "@/lib/auth-admin";
import { redirect } from "next/navigation";
import { ImportFormBase } from "@/components/import/ImportFormBase";
import { PriceBatchList } from "@/app/admin/_components/PriceBatchList";
import { PriceBatchDetail } from "@/app/admin/_components/PriceBatchDetail";
import { PriceCompareButton } from "./_components/PriceCompareButton";
import {
  getBatchDetailViewData,
  getListViewData,
} from "./_data/model-price-data";

export const dynamic = "force-dynamic";

// Model Prices 模板（7 列）：首列必须为 Category，且与前台导航分类名称完全一致；
// 复合唯一键 = Category + Model（同型号跨分类为独立报价）。Leadtime 合并库存状态（In stock / 货期文本 / Out of stock）
const PRICE_TEMPLATE_CSV = `Category,Brand,Series,Model,UnitPrice,Condition,Leadtime
Control,Siemens,S7-1200,6ES7214-1AG40-0XB0,128.00,New Original,In stock
Control,Siemens,S7-1500,6ES7511-1AK02-0AB0,455.00,New Original,2-3 weeks`;

function toStr(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function ModelPriceListPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string | string[] }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/auth/admin-login");

  const sp = await searchParams;
  const batchId = toStr(sp.batch);

  // 右栏选中文件详情：批次不存在或含错误行时回到列表视图
  const detail = batchId ? await getBatchDetailViewData(batchId) : null;
  if (batchId && !detail) redirect("/admin/model-price");

  // 左栏数据（常驻）：价格批次列表 + 上传表单系列选项
  const { listBatches, seriesOptions } = await getListViewData();

  return (
    <div className="h-full">
      {/* 左右两栏 1:1：左 = 上传+已导入文件（常驻）；右 = 选中文件详情 / 标准价格表。宽屏下各自独立滚动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
        {/* 左半（同 Product 导航交互：点击文件名后左栏保持不动） */}
        <div className="min-w-0 flex flex-col gap-3 min-h-0">
          {/* 上传区域（固定） */}
          <div className="shrink-0 bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold text-slate-800">Upload Price File</h2>
              <div className="flex items-center gap-2">
                {/* 比价任务：自动随 Confirm/Markup 触发，此处可手动补跑 */}
                <PriceCompareButton />
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(PRICE_TEMPLATE_CSV)}`}
                  download="model-price-template.csv"
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-green-700 border border-green-300 rounded-md hover:bg-green-50"
                >
                  <Download className="w-3 h-3" />
                  Template
                </a>
              </div>
            </div>
            <ImportFormBase
              batchType="price"
              subtitle=".xlsx / .xls / .csv · Required: Model, UnitPrice · Brand and Series in separate columns (e.g. Siemens | S7-1200)"
              seriesOptions={seriesOptions}
            />
          </div>

          {/* 文件列表（独立滚动） */}
          <div className="min-h-0 flex-1 flex flex-col">
            <h2 className="text-xs font-semibold text-slate-800 mb-2 shrink-0">Imported Files</h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PriceBatchList
                batches={listBatches}
                detailPathPrefix="/admin/model-price?batch="
                emptyHint="No price files yet. Upload a price file above."
              />
            </div>
          </div>
        </div>

        {/* 右半：选中文件 → 显示文件详细内容（含 Confirm/Reject/Delete）；未选 → 留白 */}
        <div className="min-w-0 flex flex-col min-h-0">
          {detail ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <PriceBatchDetail
                batch={{
                  ...detail.batch,
                  uploaderEmail: detail.batch.admin?.email ?? detail.batch.supplier?.email ?? null,
                  approvedByEmail: detail.batch.approvedBy?.email ?? null,
                }}
                items={detail.itemRows}
                modelPrices={detail.modelPrices}
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>
    </div>
  );
}
