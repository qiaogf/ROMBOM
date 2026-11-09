"use server";

// 登出 action。

import { clearSession } from "@/lib/auth";

export async function logout(): Promise<void> {
  try {
    await clearSession();
  } catch (error) {
    console.error("Logout error:", error);
  }
}
