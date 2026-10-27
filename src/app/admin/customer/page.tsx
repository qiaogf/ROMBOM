import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, User, Mail, Phone, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AccountActionButtons } from "@/app/admin/_components/AccountActionButtons";

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

export default async function CustomerListPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const sp = await searchParams;
  const selectedId = toStr(sp.id);

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  // 右栏：选中账号详情
  let detail = selectedId
    ? await prisma.customer.findUnique({ where: { customerId: selectedId } })
    : null;
  if (selectedId && !detail) redirect("/admin/customer");

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
        {/* 左半：客户列表（独立滚动） */}
        <div className="min-w-0 flex flex-col min-h-0">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="px-1.5 py-1 text-left">Name</th>
                      <th className="px-1.5 py-1 text-left">Email</th>
                      <th className="px-1.5 py-1 text-left">Country</th>
                      <th className="px-1.5 py-1 text-left">Active</th>
                      <th className="px-1.5 py-1 text-left">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                          No customers found
                        </td>
                      </tr>
                    ) : (
                      customers.map((c) => {
                        const isSelected = c.customerId === selectedId;
                        const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
                        return (
                          <tr
                            key={c.customerId}
                            className={isSelected ? "bg-blue-50/60" : "hover:bg-slate-50"}
                          >
                            <td className="px-1.5 py-1 text-slate-700 whitespace-nowrap">
                              {fullName || empty()}
                            </td>
                            <td className="px-1.5 py-1">
                              <Link
                                href={`/admin/customer?id=${c.customerId}`}
                                className={`block max-w-[180px] truncate hover:underline ${
                                  isSelected ? "text-blue-700 font-medium" : "text-blue-600"
                                }`}
                                title={c.email}
                              >
                                {c.email}
                              </Link>
                            </td>
                            <td className="px-1.5 py-1 text-slate-600">
                              {c.country ?? empty()}
                            </td>
                            <td className="px-1.5 py-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${
                                  c.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {c.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-1.5 py-1">
                              <AccountActionButtons
                                entity="customer"
                                id={c.customerId}
                                label={c.email}
                                isActive={c.isActive}
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
                href="/admin/customer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to customers
              </Link>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  {[detail.firstName, detail.lastName].filter(Boolean).join(" ") ||
                    detail.companyName ||
                    detail.email}
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
                  <DetailRow label="Country">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {detail.country || empty()}
                    </span>
                  </DetailRow>
                  <DetailRow label="City">{detail.city || empty()}</DetailRow>
                  <DetailRow label="Address">{detail.address || empty()}</DetailRow>
                  <DetailRow label="ZIP">{detail.zip || empty()}</DetailRow>
                  <DetailRow label="Phone">
                    {detail.phone ? (
                      <a
                        href={`tel:${detail.phone}`}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 shrink-0" />
                        {detail.phone}
                      </a>
                    ) : (
                      empty()
                    )}
                  </DetailRow>
                  <DetailRow label="Payment Method">{detail.paymentMethod || empty()}</DetailRow>
                </dl>
              </div>

              {/* 账号标识：邮箱 */}
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-1.5 text-xs text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a href={`mailto:${detail.email}`} className="text-blue-600 hover:underline break-all">
                  {detail.email}
                </a>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-lg bg-white/50">
              <User className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">
                Click a customer email in the list to view account details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
