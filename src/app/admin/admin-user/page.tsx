﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck, Mail, Phone } from "lucide-react";
import { getAdminSession, isSuperAdminEmail } from "@/lib/auth-admin";
import { AccountActionButtons } from "@/app/admin/_components/AccountActionButtons";
import { getAdminUserList, getAdminUserDetail } from "./_data/admin-user-data";

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

export default async function AdminUserListPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const session = await getAdminSession();
  const sp = await searchParams;
  const selectedId = toStr(sp.id);
  // 仅最高管理者对其他管理员拥有审核权
  const canReview = isSuperAdminEmail(session?.email);

  const admins = await getAdminUserList();

  // 右栏：选中账号详情
  let detail = selectedId ? await getAdminUserDetail(selectedId) : null;
  if (selectedId && !detail) redirect("/admin/admin-user");

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
        {/* 左半：管理员列表（独立滚动） */}
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
                    {admins.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                          No admin accounts found
                        </td>
                      </tr>
                    ) : (
                      admins.map((a) => {
                        const isCurrent = session?.adminId === a.adminId;
                        const isSelected = a.adminId === selectedId;
                        const isSuper = isSuperAdminEmail(a.email);
                        return (
                          <tr
                            key={a.adminId}
                            className={isSelected ? "bg-blue-50/60" : "hover:bg-slate-50"}
                          >
                            <td className="px-1.5 py-1 text-slate-700 whitespace-nowrap">
                              {a.name ?? empty()}
                            </td>
                            <td className="px-1.5 py-1">
                              <Link
                                href={`/admin/admin-user?id=${a.adminId}`}
                                className={`inline-flex items-center gap-1.5 max-w-[220px] truncate hover:underline ${
                                  isSelected ? "text-blue-700 font-medium" : "text-blue-600"
                                }`}
                                title={a.email}
                              >
                                {a.email}
                                {isCurrent && (
                                  <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-700">
                                    You
                                  </span>
                                )}
                              </Link>
                            </td>
                            <td className="px-1.5 py-1 text-slate-600">
                              {empty()}
                            </td>
                            <td className="px-1.5 py-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${
                                  a.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {a.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-1.5 py-1">
                              {isSuper ? (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-indigo-50 text-indigo-700 font-medium"
                                  title="Highest-privilege administrator; protected"
                                >
                                  Super Admin
                                </span>
                              ) : canReview ? (
                                <AccountActionButtons
                                  entity="admin"
                                  id={a.adminId}
                                  label={a.email}
                                  isActive={a.isActive}
                                />
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">—</span>
                              )}
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
                href="/admin/admin-user"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to admins
              </Link>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  {detail.name || detail.email}
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
                  <DetailRow label="Account">
                    <a
                      href={`mailto:${detail.email}`}
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
                    >
                      <Mail className="w-3 h-3 shrink-0" />
                      {detail.email}
                    </a>
                  </DetailRow>
                  <DetailRow label="Name">{detail.name || empty()}</DetailRow>
                  <DetailRow label="StaffNo">{detail.staffNo || empty()}</DetailRow>
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
                </dl>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-lg bg-white/50">
              <ShieldCheck className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">
                Click an admin email in the list to view account details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
