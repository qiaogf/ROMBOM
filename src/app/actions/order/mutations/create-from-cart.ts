"use server";

// Order creation from cart (no shipping/payment) — createOrderFromCart.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import type { OrderActionResult, OrderWithItems } from "../shared";
import { toNumber, serializeDecimals } from "../shared";
import { generateSalesOrderNumber, withOrderNumberRetry } from "./create-shared";
import { isPurchasableLeadtime } from "@/lib/cart-display";
import { computeLockExpiry, reserveStockForItems } from "@/lib/order-lock";
import { resolveCartSelfOrder } from "@/app/actions/cart/shared";
import type { CartItemWithProduct } from "@/app/actions/cart/types";

/**
 * 从购物车直接创建订单（状态 ordered / 已提交）
 * - 不涉及收货信息与支付，由 checkout 页后续补全
 * - 创建后清空购物车
 * - 同时自动生成采购订单（按供应商最优价格拆分）
 */
export async function createOrderFromCart(): Promise<OrderActionResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, message: "Please login to place an order" };
    }

    // 只读校验放在事务外：跨境库单次 RTT 0.5~1.5s，全塞进交互事务会超过默认 5s 上限
    const customer = await prisma.customer.findUnique({ where: { customerId } });
    if (!customer) return { success: false, message: "Customer not found" };
    if (!customer.isActive) return { success: false, message: "Account is not active" };

    const cart = await prisma.cart.findFirst({
      where: { customerId },
      include: {
        items: {
          include: {
            product: true,
            supplierQuote: true,
            modelPrice: { include: { importBatch: { select: { selfOrderAll: true } } } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, message: "Cart is empty" };
    }
    if (cart.items.length > 100) {
      return { success: false, message: "Cart has too many items" };
    }

    // 逐商品校验 + 计算小计（双路径兼容）
    let subtotal = 0;
    for (const item of cart.items) {
      const mp = item.modelPrice ?? null;
      const sq = item.supplierQuote ?? null;
      const product = item.product ?? null;

      const productName = mp?.productName ?? product?.productName;
      const model = mp?.model ?? product?.model;
      const price = mp ? toNumber(mp.sellPrice) : sq ? toNumber(sq.sellPrice) : 0;

      if (!productName || !model || price <= 0) {
        return { success: false, message: "Invalid item in cart" };
      }
      if (!mp && product && product.status !== "on_sale") {
        return { success: false, message: `${productName} is no longer available` };
      }
      if (item.quantity <= 0) {
        return { success: false, message: "Invalid item quantity in cart" };
      }
      if (!isPurchasableLeadtime(sq?.leadTime ?? mp?.leadTime ?? null)) {
        return { success: false, message: `${productName} is out of stock` };
      }
      const moq = mp?.moq ?? sq?.moq ?? 1;
      if (moq > 1 && item.quantity < moq) {
        return { success: false, message: `Minimum order quantity for ${productName} is ${moq}` };
      }
      // 库存校验（软预留口径：实际库存 - 已预留）
      const stockAvailable = mp
        ? mp.stockQuantity - mp.reservedQuantity
        : sq
          ? sq.stockQuantity - sq.reservedQuantity
          : null;
      if (stockAvailable !== null && stockAvailable < item.quantity) {
        return { success: false, message: `${productName} does not have enough stock` };
      }
      subtotal += price * item.quantity;
    }

    if (subtotal <= 0) return { success: false, message: "Invalid order amount" };

    // ── Self：与购物车展示同一套判定（含按品类+型号回查产品文件的开关） ──
    await resolveCartSelfOrder(cart.items as unknown as CartItemWithProduct[]);
    const needsManualConfirm = (item: (typeof cart.items)[number]) =>
      !!item.modelPrice && item.modelPrice.selfOrder !== true;
    const requiresManualConfirm = cart.items.some(needsManualConfirm);

    // 写入阶段收窄成短事务：订单 + 订单项 + 批量预留库存 + 清空购物车
    const order = await withOrderNumberRetry(() =>
      prisma.$transaction(
        async (tx) => {
        const orderNumber = await generateSalesOrderNumber(tx);
        const created = await tx.salesOrder.create({
          data: {
            orderNumber,
            customerId,
            subtotal,
            shippingCost: 0,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: subtotal,
            currency: "USD",
            paymentStatus: "pending",
            orderStatus: "pending_review",
            soStatus: "ordered",
            deliveryMethod: "standard",
            lockExpiresAt: computeLockExpiry(),
            stockLocked: true,
            requiresManualConfirm,
          },
        });

        await tx.salesOrderItem.createMany({
          data: cart.items.map((item) => {
            const mp = item.modelPrice ?? null;
            const sq = item.supplierQuote ?? null;
            const product = item.product ?? null;
            const productName = mp?.productName ?? product?.productName!;
            const model = mp?.model ?? product?.model!;
            const price = mp ? toNumber(mp.sellPrice) : sq ? toNumber(sq.sellPrice) : 0;
            const leadTime = sq?.leadTime ?? mp?.leadTime ?? null;
            return {
              orderId: created.orderId,
              quoteId: item.quoteId,
              productId: item.productId,
              modelPriceId: item.modelPriceId,
              productName,
              model,
              unitPrice: price,
              finalSellPrice: price,
              quantity: item.quantity,
              subtotal: price * item.quantity,
              leadTime,
              requiresManualConfirm: needsManualConfirm(item),
              itemStatus: "ordered",
              weight: mp?.weight != null ? toNumber(mp.weight) : null,
              weightUnit: mp?.weightUnit ?? null,
            };
          }),
        });

        // 软预留库存（48 小时内未支付则由清扫任务释放）
        await reserveStockForItems(
          tx,
          cart.items.map((item) => ({
            modelPriceId: item.modelPriceId,
            quoteId: item.quoteId,
            quantity: item.quantity,
          }))
        );

        // 清空购物车
        await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });

        return created;
        },
        { maxWait: 20000, timeout: 60000 }
      )
    );

    // Prisma Decimal 无法被 React 序列化传给客户端（会抛 "Decimal objects are not supported"），必须转 number
    return {
      success: true,
      message: "Order created",
      order: serializeDecimals({ ...order, items: [] }) as OrderWithItems,
    };
  } catch (error) {
    console.error("Create order from cart error:", error);
    return { success: false, message: "An error occurred while creating order" };
  }
}
