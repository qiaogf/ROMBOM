import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-amber-50 p-4">
      <Link href="/" className="mb-8 text-2xl font-bold text-green-800 hover:opacity-80 transition-opacity">
        Global-TECH
      </Link>
      {children}
    </div>
  );
}
