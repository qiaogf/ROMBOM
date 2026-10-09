import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { getSupplierSession, clearSupplierSession } from "@/lib/auth-admin";

export const dynamic = "force-dynamic";

// Inline server action — clears supplier cookies then redirects to home.
async function logoutAction() {
  "use server";
  await clearSupplierSession();
  redirect("/");
}

export default async function SupplierLayout({ children }: { children: ReactNode }) {
  const session = await getSupplierSession();
  if (!session) redirect("/auth/supplier-login");

  return (
    <div className="h-screen supports-[height:100dvh]:h-dvh flex flex-col bg-slate-50">
      {/* Top bar */}
      <header className="h-11 shrink-0 flex items-center justify-between px-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-green-700" />
          <span className="text-[13px] font-semibold text-slate-800">Supplier Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-slate-700">{session.supplierName}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-green-700 rounded hover:bg-green-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </form>
        </div>
      </header>

      {/* Two-panel content: left Import Price, right Purchase Order */}
      <main className="flex-1 min-h-0 flex">{children}</main>
    </div>
  );
}
