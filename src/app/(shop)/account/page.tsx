import Link from "next/link";
import { getOrders } from "@/app/actions/orderActions";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountContent } from "./AccountContent";
import { User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const userId = await getCurrentUserId();
  const orders = userId ? await getOrders() : [];

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">My Account</h1>
          <p className="text-slate-500 mb-8">Please login to access your account.</p>
          <Link
            href="/account/login"
            className="btn-primary"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { customerId: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      country: true,
      currency: true,
    },
  });

  return <AccountContent orders={orders} customer={customer} />;
}