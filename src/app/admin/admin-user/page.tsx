import { redirect } from "next/navigation";
import { getAdminSession, isSuperAdminEmail } from "@/lib/auth-admin";
import type { AdminUser } from "@/../prisma/generated/client";
import { AccountActionButtons } from "@/app/admin/_components/AccountActionButtons";
import { WorkIdInput } from "@/app/admin/_components/WorkIdInput";
import { getAdminUserList } from "./_data/admin-user-data";

export const dynamic = "force-dynamic";

/**
 * Admin 账户页 — 左右两栏都是账户列表
 * 左栏：Work ID 首位为 1 的账户；右栏：其余账户（含未填写 Work ID）
 * 两栏各自按 Work ID 升序（数字按自然序，空值排最后，同值按 email）
 */
function compareWorkId(a: AdminUser, b: AdminUser): number {
  const x = a.staffNo?.trim() ?? "";
  const y = b.staffNo?.trim() ?? "";
  if (!x && !y) return a.email.localeCompare(b.email);
  if (!x) return 1;
  if (!y) return -1;
  return x.localeCompare(y, undefined, { numeric: true });
}

function AdminTable({ rows, currentAdminId }: { rows: AdminUser[]; currentAdminId?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-1.5 py-1 text-left whitespace-nowrap">Work ID</th>
              <th className="px-1.5 py-1 text-left">Email</th>
              <th className="px-1.5 py-1 text-left whitespace-nowrap">Active</th>
              <th className="px-1.5 py-1 text-left whitespace-nowrap">Act</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                  No admin accounts found
                </td>
              </tr>
            ) : (
              rows.map((a) => {
                const isCurrent = currentAdminId === a.adminId;
                const isSuper = isSuperAdminEmail(a.email);
                return (
                  <tr key={a.adminId} className="hover:bg-slate-50">
                    <td className="px-1.5 py-1 align-middle">
                      <WorkIdInput adminId={a.adminId} workId={a.staffNo} />
                    </td>
                    <td className="px-1.5 py-1 align-middle">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="max-w-[200px] truncate text-slate-700" title={a.email}>
                          {a.email}
                        </span>
                        {isCurrent && (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-700">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-1.5 py-1 align-middle">
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
                    <td className="px-1.5 py-1 align-middle">
                      {isSuper ? (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-indigo-50 text-indigo-700 font-medium"
                          title="Highest-privilege administrator; protected"
                        >
                          Super Admin
                        </span>
                      ) : (
                        <AccountActionButtons
                          entity="admin"
                          id={a.adminId}
                          label={a.email}
                          isActive={a.isActive}
                          showReject={false}
                        />
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
  );
}

export default async function AdminUserListPage() {
  const session = await getAdminSession();
  // 账号类页面仅 Super Admin 可进入
  if (!isSuperAdminEmail(session?.email)) redirect("/admin");

  const admins = await getAdminUserList();
  const sorted = [...admins].sort(compareWorkId);

  const leftRows = sorted.filter((a) => a.staffNo?.trim().startsWith("1"));
  const rightRows = sorted.filter((a) => !a.staffNo?.trim().startsWith("1"));

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
        <div className="min-w-0 flex flex-col min-h-0">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AdminTable rows={leftRows} currentAdminId={session?.adminId} />
          </div>
        </div>
        <div className="min-w-0 flex flex-col min-h-0">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <AdminTable rows={rightRows} currentAdminId={session?.adminId} />
          </div>
        </div>
      </div>
    </div>
  );
}
