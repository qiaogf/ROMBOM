import { prisma } from "@/lib/prisma";
import {
  ReceivablesTable,
  PayablesTable,
  type ReceivableRow,
  type PayableRow,
} from "./_components/CapitalTables";

export const dynamic = "force-dynamic";

export default async function LogisticsCapitalPage() {
  const [salesOrders, purchaseOrders] = await Promise.all([
    prisma.salesOrder.findMany({
      orderBy: { orderTime: "desc" },
      select: {
        orderId: true,
        orderNumber: true,
        totalAmount: true,
        paymentMethod: true,
        soStatus: true,
        orderStatus: true,
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      orderBy: { orderTime: "desc" },
      select: {
        poId: true,
        poNumber: true,
        totalAmount: true,
        paymentMethod: true,
        poStatus: true,
        supplier: { select: { email: true } },
        salesOrder: { select: { orderNumber: true } },
      },
    }),
  ]);

  const receivables: ReceivableRow[] = salesOrders.map((so) => {
    const full = [so.customer.firstName, so.customer.lastName].filter(Boolean).join(" ").trim();
    return {
      orderId: so.orderId,
      orderNumber: so.orderNumber,
      customerName: full || so.customer.email,
      totalAmount: Number(so.totalAmount),
      paymentMethod: so.paymentMethod,
      // soStatus 为 null（旧数据）时回退到 orderStatus 的英文枚举
      status: so.soStatus ?? so.orderStatus.replace(/_/g, " "),
    };
  });

  const payables: PayableRow[] = purchaseOrders.map((po) => ({
    poId: po.poId,
    salesOrderNumber: po.salesOrder?.orderNumber ?? null,
    poNumber: po.poNumber,
    supplierEmail: po.supplier?.email ?? null,
    totalAmount: Number(po.totalAmount),
    paymentMethod: po.paymentMethod,
    status: po.poStatus,
  }));

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="min-w-0">
        <ReceivablesTable rows={receivables} />
      </div>
      <div className="min-w-0">
        <PayablesTable rows={payables} />
      </div>
    </div>
  );
}
