import { redirect } from "next/navigation";
import { AccountActionButtons } from "@/app/admin/_components/AccountActionButtons";
import { SupplierIdInput } from "@/app/admin/_components/SupplierIdInput";
import { getSupplierList } from "./_data/supplier-data";
import { getAdminSession, isSuperAdminEmail } from "@/lib/auth-admin";

export const dynamic = "force-dynamic";

type SupplierRow = Awaited<ReturnType<typeof getSupplierList>>[number];

/**
 * Supplier 账户页 — 左右两栏都是账户列表
 * 左栏：Supplier ID 首位为 1 的账户；右栏：其余账户（含未填写 Supplier ID）
 * 两栏各自按 Supplier ID 升序（数字按自然序，空值排最后，同值按 email）
 */
function compareSupplierId(a: SupplierRow, b: SupplierRow): number {
  const x = a.supplierNo?.trim() ?? "";
  const y = b.supplierNo?.trim() ?? "";
  if (!x && !y) return a.email.localeCompare(b.email);
  if (!x) return 1;
  if (!y) return -1;
  return x.localeCompare(y, undefined, { numeric: true });
}

function SupplierTable({ rows }: { rows: SupplierRow[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="w-[90px] px-1 py-1 text-left whitespace-nowrap">Supplier ID</th>
              <th className="w-[150px] px-1 py-1 text-left">Email</th>
              <th className="w-[72px] px-1 py-1 text-left whitespace-nowrap">Active</th>
              <th className="w-[180px] px-1 py-1 text-left whitespace-nowrap">Act</th>
              <th className="w-[130px] px-1 py-1 text-left whitespace-nowrap">Brand</th>
              <th className="px-1 py-1"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  No suppliers found
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.supplierId} className="hover:bg-slate-50">
                  <td className="px-1 py-0.5 align-middle">
                    <SupplierIdInput supplierId={s.supplierId} value={s.supplierNo} />
                  </td>
                  <td className="px-1 py-0.5 align-middle">
                    <div className="truncate text-slate-700" title={s.email}>
                      {s.email}
                    </div>
                  </td>
                  <td className="px-1 py-0.5 align-middle">
                    <span
                      className={`inline-flex items-center px-1 py-0.5 text-[10px] rounded ${
                        s.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-1 py-0.5 align-middle">
                    <AccountActionButtons
                      entity="supplier"
                      id={s.supplierId}
                      label={s.supplierName}
                      isActive={s.isActive}
                    />
                  </td>
                  <td className="px-1 py-0.5 align-middle">
                    {s.brands.length === 0 ? (
                      <span className="text-slate-400 italic">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-0.5">
                        {s.brands.map((b) => (
                          <span
                            key={b.brandName}
                            className="inline-flex max-w-full items-center truncate px-1 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700"
                            title={b.brandName}
                          >
                            {b.brandName}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-1 py-0.5"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function SupplierListPage() {
  // 账号类页面仅 Super Admin 可进入
  const session = await getAdminSession();
  if (!isSuperAdminEmail(session?.email)) redirect("/admin");

  const suppliers = await getSupplierList();
  const sorted = [...suppliers].sort(compareSupplierId);

  const leftRows = sorted.filter((s) => s.supplierNo?.trim().startsWith("1"));
  const rightRows = sorted.filter((s) => !s.supplierNo?.trim().startsWith("1"));

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
        <div className="min-w-0 flex flex-col min-h-0">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SupplierTable rows={leftRows} />
          </div>
        </div>
        <div className="min-w-0 flex flex-col min-h-0">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SupplierTable rows={rightRows} />
          </div>
        </div>
      </div>
    </div>
  );
}
