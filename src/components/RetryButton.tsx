"use client";

import { useRouter } from "next/navigation";

export function RetryButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.refresh()}
      className={className}
    >
      Refresh Page
    </button>
  );
}