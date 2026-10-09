import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import { getAdminSession, clearAdminSession } from "@/lib/auth-admin";
import { AdminNav } from "./_components/AdminNav";
import { AdminPageTitle } from "./_components/AdminPageTitle";

export const dynamic = "force-dynamic";

async function handleLogout() {
  "use server";
  await clearAdminSession();
  // 登出后直接返回主页
  redirect("/");
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/auth/admin-login");
  }

  return (
    <div className="h-screen supports-[height:100dvh]:h-dvh flex bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-36 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="h-11 flex items-center gap-1.5 px-3 border-b border-slate-200 bg-white">
          <Shield className="w-4 h-4 text-slate-700" />
          <span className="text-[13px] font-semibold text-slate-800">Admin Panel</span>
        </div>
        <AdminNav />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-11 shrink-0 bg-white border-b border-slate-200 flex items-center px-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[13px] font-semibold text-slate-800">
              Admin Panel
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              · {session.email}
            </span>
          </div>
          {/* 居中页面标题 */}
          <div className="flex-1 flex justify-center min-w-0">
            <AdminPageTitle />
          </div>
          <form action={handleLogout} className="shrink-0">
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-green-700 rounded hover:bg-green-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </form>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-3">{children}</main>
      </div>
    </div>
  );
}
