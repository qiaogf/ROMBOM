// 销售 / 采购明细金额共用的小数舍入工具（保留 4 位，避免浮点误差）
// 仅供 orders/sales.ts 与 orders/purchase.ts 内部使用，不通过 barrel 导出。

export const round4 = (n: number) => Math.round(n * 10000) / 10000;
