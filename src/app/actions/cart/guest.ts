"use server";

// Guest (not-logged-in) cart support — read-only price lookup + post-login merge.
// 游客购物车本体存放在浏览器 localStorage（components/cart/guest-cart.ts），
// 服务端只负责：① 返回真实价格行供本地构造伪条目；② 登录后把本地行合并入库。

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { decimalToNumber } from "@/lib/price";
import { isValidIdFormat } from "@/lib/security";
import { isInStock, resolveSingleSelfOrder } from "./shared";
import { addToCart, addToCartByModelPrice } from "./add";

/** ModelPrice 路径伪条目价格行（字段与 CartItemRelationsInput["modelPrice"] 对齐） */
export interface GuestModelPriceData {
  modelPriceId: string;
  productName: string;
  model: string;
  unit: string;
  sellPrice: number;
  moq: number;
  condition: string | null;
  leadTime: string | null;
  thumbnail: string | null;
  /** 可自助下单结算（淡绿） */
  selfOrder: boolean;
}

/** SupplierQuote 路径伪条目价格行 */
export interface GuestQuoteData {
  productId: string;
  quoteId: string;
  product: { productName: string; model: string; unit: string; thumbnail: string | null };
  quote: {
    sellPrice: number;
    moq: number;
    leadTime: string | null;
  };
}

export interface GuestLookupResult<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface GuestMergeResult {
  success: boolean;
  merged: number;
  failed: number;
  message: string;
}

interface GuestMergeInput {
  productId?: string | null;
  quoteId?: string | null;
  modelPriceId?: string | null;
  quantity: number;
}

/** 游客按 ModelPrice 查价（校验同 addToCartByModelPrice：上架 + 可售库存） */
export async function getModelPriceForGuest(
  modelPriceId: string
): Promise<GuestLookupResult<GuestModelPriceData>> {
  try {
    if (!isValidIdFormat(modelPriceId)) {
      return { success: false, message: "Invalid model price ID" };
    }
    const mp = await prisma.modelPrice.findUnique({ where: { modelPriceId } });
    if (!mp || !mp.isActive) {
      return { success: false, message: "Product price not found or unavailable" };
    }
    if (mp.status !== "on_sale") {
      return { success: false, message: "Product is not on sale" };
    }
    if (!isInStock(mp)) {
      return { success: false, message: "Product is currently out of stock" };
    }
    const selfOrder = await resolveSingleSelfOrder(modelPriceId);
    return {
      success: true,
      message: "OK",
      data: {
        modelPriceId: mp.modelPriceId,
        productName: mp.productName,
        model: mp.model,
        unit: mp.unit,
        sellPrice: decimalToNumber(mp.sellPrice),
        moq: mp.moq,
        condition: mp.condition,
        leadTime: mp.leadTime,
        thumbnail: mp.thumbnail,
        selfOrder: selfOrder === true,
      },
    };
  } catch {
    return { success: false, message: "An error occurred while fetching product price" };
  }
}

/** 游客按 SupplierQuote 查价（校验同 addToCart：有效报价 + 产品上架 + 可售库存） */
export async function getQuoteForGuest(
  productId: string,
  quoteId: string
): Promise<GuestLookupResult<GuestQuoteData>> {
  try {
    if (!isValidIdFormat(productId) || !isValidIdFormat(quoteId)) {
      return { success: false, message: "Invalid product or quote ID" };
    }
    const quote = await prisma.supplierQuote.findUnique({
      where: { quoteId },
      include: { product: true },
    });
    if (!quote || !quote.isValid) {
      return { success: false, message: "Product quote not found or unavailable" };
    }
    if (quote.productId !== productId) {
      return { success: false, message: "Invalid product-quote combination" };
    }
    if (quote.product.status !== "on_sale") {
      return { success: false, message: "Product is not on sale" };
    }
    if (!isInStock(quote)) {
      return { success: false, message: "Product is currently out of stock" };
    }
    return {
      success: true,
      message: "OK",
      data: {
        productId: quote.productId,
        quoteId: quote.quoteId,
        product: {
          productName: quote.product.productName,
          model: quote.product.model,
          unit: quote.product.unit,
          thumbnail: quote.product.thumbnail,
        },
        quote: {
          sellPrice: decimalToNumber(quote.sellPrice),
          moq: quote.moq,
          leadTime: quote.leadTime,
        },
      },
    };
  } catch {
    return { success: false, message: "An error occurred while fetching product quote" };
  }
}

/**
 * 登录后合并游客购物车：逐行走既有 addToCart / addToCartByModelPrice
 * （自带 MOQ/库存/上限校验与同型号数量合并）。失效行跳过并在 failed 计数，
 * 不阻塞其余行入库。
 */
export async function mergeGuestCart(inputs: GuestMergeInput[]): Promise<GuestMergeResult> {
  try {
    const customerId = await getCurrentUserId();
    if (!customerId) {
      return { success: false, merged: 0, failed: inputs.length, message: "Please login first" };
    }
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return { success: true, merged: 0, failed: 0, message: "Nothing to merge" };
    }

    let merged = 0;
    let failed = 0;
    for (const input of inputs.slice(0, 100)) {
      const quantity = Number.isInteger(input.quantity) && input.quantity >= 1 ? input.quantity : 1;
      let result;
      if (input.modelPriceId && input.quoteId) {
        failed++;
        continue;
      } else if (input.modelPriceId) {
        result = await addToCartByModelPrice(input.modelPriceId, quantity);
      } else if (input.productId && input.quoteId) {
        result = await addToCart(input.productId, input.quoteId, quantity);
      } else {
        result = null;
      }
      if (result && result.success) merged++;
      else failed++;
    }
    return {
      success: true,
      merged,
      failed,
      message: failed === 0 ? `Merged ${merged} item(s)` : `Merged ${merged}, skipped ${failed} unavailable item(s)`,
    };
  } catch {
    return { success: false, merged: 0, failed: inputs.length, message: "Failed to merge guest cart" };
  }
}
