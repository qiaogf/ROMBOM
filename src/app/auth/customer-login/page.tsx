"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { login } from "@/app/actions/authActions";

function CustomerLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/cart";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);
    if (result.success) {
      router.push(redirect);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <div className="flex items-center gap-2 mb-6">
        <LogIn className="w-6 h-6 text-green-700" />
        <h1 className="text-xl font-bold text-slate-800">Customer Login</h1>
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
          className="w-full py-2 bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-800 disabled:opacity-60">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <a href="/auth/customer-register" className="text-green-700 hover:underline">Register</a>
      </p>
    </div>
  );
}

// Suspense 包裹：useSearchParams() 静态预渲染必须置于 Suspense 边界内
export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-slate-500 text-sm">
          Loading...
        </div>
      }
    >
      <CustomerLoginInner />
    </Suspense>
  );
}
