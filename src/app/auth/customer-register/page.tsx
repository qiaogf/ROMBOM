"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { register } from "@/app/actions/authActions";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", country: "US", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) {
      router.push("/cart");
    } else {
      setError(result.message);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-green-500";

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-6 h-6 text-green-700" />
        <h1 className="text-xl font-bold text-slate-800">Customer Register</h1>
      </div>

      {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-md">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2 bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-800 disabled:opacity-60">
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account? <a href="/auth/customer-login" className="text-green-700 hover:underline">Login</a>
      </p>
    </div>
  );
}
