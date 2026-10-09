import { Download } from "lucide-react";
import { getAdminSession } from "@/lib/auth-admin";
import { redirect } from "next/navigation";
import { ImportFormBase } from "@/components/import/ImportFormBase";
import { PriceBatchList } from "@/app/admin/_components/PriceBatchList";
import { PriceBatchDetail } from "@/app/admin/_components/PriceBatchDetail";
import { StandardPriceTable } from "@/app/admin/_components/StandardPriceTable";
import {
  getBatchDetailViewData,
  getListViewData,
  getStandardPriceGroups,
} from "./_data/model-price-data";

export const dynamic = "force-dynamic";

// Model Prices 模板（7 列，与 Supplier Portal 模板格式一致）
const PRICE_TEMPLATE_CSV = `Series,Model,Unit Price,MOQ,Product Condition,Stock Status,Lead Time
Siemens S7-1200,6ES7214-1AG40-0XB0,128.00,1,New Original,in_stock,3-5 days
Siemens S7-1500,6ES7511-1AK02-0AB0,455.00,1,New Original,lead_time,2-3 weeks`;

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

  // 批次详情视图
  if (batchId) {
    const detail = await getBatchDetailViewData(batchId);
    if (!detail) redirect("/admin/model-price");
    const { batch, itemRows, modelPrices } = detail;

    // 右栏：全部上架的标准价格表（与列表视图同源）
    const standardGroups = await getStandardPriceGroups();

    return (
      <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 左半：文件详情 */}
        <div className="min-w-0 flex flex-col min-h-0">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <PriceBatchDetail
              batch={{
                ...batch,
                uploaderEmail: batch.admin?.email ?? batch.supplier?.email ?? null,
                approvedByEmail: batch.approvedBy?.email ?? null,
              }}
              items={itemRows}
              modelPrices={modelPrices}
            />
          </div>
        </div>

        {/* 右半：标准价格表（公开报价页数据源） */}
        <div className="min-w-0 flex flex-col min-h-0">
          <h2 className="text-xs font-semibold text-slate-800 mb-2 shrink-0">
            Standard Price Table
            <span className="ml-1 text-[10px] font-normal text-slate-400">— shown on public quote</span>
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <StandardPriceTable groups={standardGroups} />
          </div>
        </div>
      </div>
    );
  }

  // 列表视图：左半 = Upload + Imported Files；右半 = 标准价格表（按系列分组）
  const { listBatches, seriesOptions } = await getListViewData();
  const standardGroups = await getStandardPriceGroups();

  return (
    <div className="h-full">
      {/* 左右两栏 1:1：左 = 上传+已导入文件；右 = 标准价格表。宽屏下各自独立滚动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
        {/* 左半 */}
        <div className="min-w-0 flex flex-col gap-3 min-h-0">
          {/* 上传区域（固定） */}
          <div className="shrink-0 bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold text-slate-800">Upload Price File</h2>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(PRICE_TEMPLATE_CSV)}`}
                download="model-price-template.csv"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-green-700 border border-green-300 rounded-md hover:bg-green-50"
              >
                <Download className="w-3 h-3" />
                Template
              </a>
            </div>
            <ImportFormBase
              batchType="price"
              subtitle=".xlsx / .xls / .csv · Required: Model, Unit Price · Series column assigns each row"
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

        {/* 右半：标准价格表（公开报价页数据源，独立滚动） */}
        <div className="min-w-0 flex flex-col min-h-0">
          <h2 className="text-xs font-semibold text-slate-800 mb-2 shrink-0">
            Standard Price Table
            <span className="ml-1 text-[10px] font-normal text-slate-400">— shown on public quote</span>
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <StandardPriceTable groups={standardGroups} />
          </div>
        </div>
      </div>
    </div>
  );
}
