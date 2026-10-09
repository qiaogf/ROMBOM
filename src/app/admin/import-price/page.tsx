import { Download, FileText } from "lucide-react";
import { getAdminSession } from "@/lib/auth-admin";
import { redirect } from "next/navigation";
import { ImportFormBase } from "@/components/import/ImportFormBase";
import { ImportBatchList } from "@/app/admin/_components/ImportBatchList";
import { ImportBatchDetail } from "@/app/admin/_components/ImportBatchDetail";
import { getListData, getDetailData } from "./_data/import-price-data";

export const dynamic = "force-dynamic";

const TEMPLATE_CSV = `Brand,Series,Product Name,Model,Description,Origin,Certifications,Length,Width,Height,Diameter,Dimension Unit,Weight,Packing Weight,Weight Unit,Battery Attributes,Datasheet Link
Siemens,S7-1200,CPU 1214C,6ES7214-1AG40-0XB0,CPU 1214C DC/DC/DC,Germany,CE/UL,110,100,75,,,mm,0.5,0.6,kg,,https://example.com/datasheet.pdf
Siemens,S7-1500,CPU 1511C,6ES7511-1AK02-0AB0,CPU 1511C PN,Germany,CE/UL,120,95,80,,,mm,0.6,0.7,kg,,https://example.com/datasheet2.pdf`;

function toStr(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminImportPricePage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string | string[] }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/auth/admin-login");

  const sp = await searchParams;
  const batchId = toStr(sp.batch);

  // 左栏：product_info 批次列表 + 系列选项（始终加载）
  const { listBatches, seriesOptions } = await getListData();

  // 右栏：选中文件的具体内容
  const detail = batchId ? await getDetailData(batchId) : null;
  if (batchId && !detail) redirect("/admin/import-price");

  return (
    <div className="h-full">
      {/* 左右两栏 1:1：左 = 上传+已导入文件；右 = 文件具体内容。宽屏下各自独立滚动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
        {/* 左半 */}
        <div className="min-w-0 flex flex-col gap-3 min-h-0">
          {/* 上传区域（固定） */}
          <div className="shrink-0 bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-xs font-semibold text-slate-800">Upload Products File</h2>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
                download="product-import-template.csv"
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-green-700 border border-green-300 rounded-md hover:bg-green-50"
              >
                <Download className="w-3 h-3" />
                Template
              </a>
            </div>
            <ImportFormBase
              batchType="product_info"
              subtitle=".xlsx / .xls / .csv · Required: Name, Model · Series column assigns each row"
              seriesOptions={seriesOptions}
            />
          </div>

          {/* 文件列表（独立滚动） */}
          <div className="min-h-0 flex-1 flex flex-col">
            <h2 className="text-xs font-semibold text-slate-800 mb-2 shrink-0">Imported Files</h2>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ImportBatchList
                batches={listBatches}
                detailHref={(id) => `/admin/import-price?batch=${id}`}
                emptyHint="No imported files yet. Upload a file above."
              />
            </div>
          </div>
        </div>

        {/* 右半：文件具体内容（独立滚动）；未选文件时显示占位 */}
        <div className="min-w-0 flex flex-col min-h-0">
          {detail ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ImportBatchDetail
                batch={detail.batch}
                items={detail.items}
                modelPrices={detail.modelPrices}
                backHref="/admin/import-price"
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-lg bg-white/50">
              <FileText className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">Select a file from the list to view its contents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
