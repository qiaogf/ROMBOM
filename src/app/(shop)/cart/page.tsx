import { getCurrentCart } from "@/app/actions/cartActions";
import { getCurrentUser } from "@/lib/auth";
import { CartContent } from "./CartContent";

export const dynamic = "force-dynamic";

/**
 * Cart 页 — 未登录也可查看购物车内容
 */
export default async function CartPage() {
  const user = await getCurrentUser();
  const cart = user ? await getCurrentCart() : null;

  return <CartContent cart={cart} isLoggedIn={Boolean(user)} />;
}
