import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, Building2, Globe, Mail } from "lucide-react";
import { AccountActionButtons } from "@/app/admin/_components/AccountActionButtons";
import { QualificationLevelInput } from "@/app/admin/_components/QualificationLevelInput";
import { getSupplierList, getSupplierDetail } from "./_data/supplier-data";

export const dynamic = "force-dynamic";

function toStr(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function empty(): ReactNode {
  return <span className="text-slate-400 italic">—</span>;
}

// 右侧详情行：左标签右值
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-3 py-1.5 items-start">
      <dt className="text-[10px] uppercase tracking-wide text-slate-400 pt-0.5">{label}</dt>
      <dd className="col-span-2 text-xs text-slate-800 break-words">{children}</dd>
    </div>
  );
}

export default async function SupplierListPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const sp = await searchParams;
  const selectedId = toStr(sp.id);

  const suppliers = await getSupplierList();

  // 右栏：选中账号详情（含名下 Brand）
  let detail: Awaited<ReturnType<typeof getSupplierDetail>> = null;
  if (selectedId) {
    detail = await getSupplierDetail(selectedId);
    if (!detail) redirect("/admin/supplier");
  }

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
        {/* 左半：供应商列表（独立滚动） */}
        <div className="min-w-0 flex flex-col min-h-0">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs table-fixed">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="w-1/5 px-1.5 py-1 text-left">Email</th>
                      <th className="w-1/5 px-1.5 py-1 text-left">Country</th>
                      <th className="w-1/5 px-1.5 py-1 text-left">Active</th>
                      <th className="w-1/5 px-1.5 py-1 text-left">Level</th>
                      <th className="w-1/5 px-1.5 py-1 text-left">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                          No suppliers found
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((s) => {
                        const isSelected = s.supplierId === selectedId;
                        return (
                          <tr
                            key={s.supplierId}
                            className={isSelected ? "bg-blue-50/60" : "hover:bg-slate-50"}
                          >
                            <td className="px-1.5 py-1">
                              <Link
                                href={`/admin/supplier?id=${s.supplierId}`}
                                className={`block truncate hover:underline ${
                                  isSelected ? "text-blue-700 font-medium" : "text-blue-600"
                                }`}
                                title={s.email}
                              >
                                {s.email}
                              </Link>
                            </td>
                            <td className="px-1.5 py-1 text-slate-600">
                              {s.country || empty()}
                            </td>
                            <td className="px-1.5 py-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${
                                  s.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {s.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-1.5 py-1">
                              <QualificationLevelInput
                                supplierId={s.supplierId}
                                level={s.qualificationLevel}
                              />
                            </td>
                            <td className="px-1.5 py-1">
                              <AccountActionButtons
                                entity="supplier"
                                id={s.supplierId}
                                label={s.supplierName}
                                isActive={s.isActive}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 右半：账号详情（独立滚动）；未选账号时显示占位 */}
        <div className="min-w-0 flex flex-col min-h-0">
          {detail ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3">
              <Link
                href="/admin/supplier"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to suppliers
              </Link>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {detail.supplierName}
                </h1>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${
                    detail.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {detail.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <dl className="divide-y divide-slate-100">
                  <DetailRow label="Country">{detail.country || empty()}</DetailRow>
                  <DetailRow label="Supplier Name">{detail.supplierName}</DetailRow>
                  <DetailRow label="Contact Person">{detail.name || empty()}</DetailRow>
                  <DetailRow label="Phone">{detail.phone || empty()}</DetailRow>
                  <DetailRow label="Email">
                    <a
                      href={`mailto:${detail.email}`}
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
                    >
                      <Mail className="w-3 h-3 shrink-0" />
                      {detail.email}
                    </a>
                  </DetailRow>
                  <DetailRow label="Address">{detail.address || empty()}</DetailRow>
                  <DetailRow label="Website">
                    {detail.website ? (
                      <a
                        href={detail.website.startsWith("http") ? detail.website : `https://${detail.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        {detail.website}
                      </a>
                    ) : (
                      empty()
                    )}
                  </DetailRow>
                  <DetailRow label="Payment Term">{detail.paymentTerm || empty()}</DetailRow>
                  <DetailRow label="Currency">{detail.currency || empty()}</DetailRow>
                  <DetailRow label="Tax ID / VAT">{detail.taxId || empty()}</DetailRow>
                  <DetailRow label="Bank Info">
                    <span className="whitespace-pre-wrap">{detail.bankInfo || empty()}</span>
                  </DetailRow>
                  <DetailRow label="Brand">
                    {detail.brands.length === 0 ? (
                      empty()
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {detail.brands.map((b) => (
                          <span
                            key={b.brandName}
                            className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700"
                          >
                            {b.brandName}
                          </span>
                        ))}
                      </div>
                    )}
                  </DetailRow>
                </dl>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-lg bg-white/50">
              <Building2 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">
                Click a supplier email in the list to view account details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
