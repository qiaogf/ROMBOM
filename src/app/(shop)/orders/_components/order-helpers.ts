// Shared display helpers for My Orders page (list + detail sub-tables).
// Extracted from OrdersContent.tsx (Phase 19) — pure move, zero behavior change.
// 2026-11-18：移除已废弃的 SO_STATUS_LABEL / soStatusBadgeClass（Status 列已改用生命周期徽章）

import { formatDateYYMMDD } from "@/lib/format";

/** 订单日期统一格式：YYMMDD（如 261118） */
export const formatDate = formatDateYYMMDD;
