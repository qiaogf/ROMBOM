"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import { adminLoginAction } from "@/app/actions/adminActions";

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin/import-price";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", password);
    const data = await adminLoginAction(fd);
    setLoading(false);
    if (data.success) {
      router.push(redirect);
    } else {
      setError(data.message || "Login failed");
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-green-700" />
        <h1 className="text-xl font-bold text-slate-800">Admin Login</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-md">{error}</div>}

      <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="text" inputMode="email" required autoComplete="new-password" data-lpignore="true" data-form-type="other" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" required autoComplete="new-password" data-lpignore="true" data-form-type="other" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-green-500" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-900 disabled:opacity-60">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

// Suspense 包裹：useSearchParams() 静态预渲染必须置于 Suspense 边界内
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-slate-500 text-sm">
          Loading...
        </div>
      }
    >
      <AdminLoginInner />
    </Suspense>
  );
}
