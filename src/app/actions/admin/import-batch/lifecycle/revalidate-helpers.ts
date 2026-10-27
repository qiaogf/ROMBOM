"use server";

// 批次上线/下线后刷新公开报价相关页面的静态缓存。
// 公开页（首页、报价表、商品页）均为 s-maxage=3600 的 ISR 缓存，
// Confirm/Reject/Delete 变更线上数据后必须显式失效，否则最长 1 小时才可见。

export async function revalidatePublicQuotePages(): Promise<void> {
  const { revalidatePath, revalidateTag } = await import("next/cache");
  revalidatePath("/", "layout");
  // 失效前台浏览数据缓存（category/brand/catalog 分组查询，tags: catalog）
  // { expire: 0 } 立即过期（Next 16 双参签名），确保 Confirm 后公开页立刻可见新价格
  revalidateTag("catalog", { expire: 0 });
}
