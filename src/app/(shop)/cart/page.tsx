import { lookupCurrentCart } from "@/app/actions/cartActions";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { CartContent } from "./CartContent";

export const dynamic = "force-dynamic";

/**
 * Cart 页 — 未登录也可查看购物车内容
 */
export default async function CartPage() {
  const lookup = await lookupCurrentCart();

  // 数据库暂时不可用：不要渲染成"购物车为空"
  if (lookup.status === "unavailable") {
    return (
      <ServiceUnavailable
        retryHref="/cart"
        message="We couldn't load your cart just now. Your items are safe — please try again in a moment."
      />
    );
  }

  const cart = lookup.status === "ok" ? lookup.cart : null;
  const isLoggedIn = lookup.status === "ok";

  return <CartContent cart={cart} isLoggedIn={isLoggedIn} />;
}
