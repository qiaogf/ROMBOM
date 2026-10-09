import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { User, Mail, Globe, CreditCard, ChevronLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <User className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Account Settings</h1>
          <p className="text-slate-500 text-lg mb-10">Please sign in to access your account settings.</p>
          <Link
            href="/account/login"
            className="inline-flex items-center px-8 py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all duration-200 group"
          >
            <span>Sign In</span>
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  const user = await prisma.customer.findUnique({
    where: { customerId: userId },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <User className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Account Not Found</h1>
          <p className="text-slate-500 text-lg mb-10">We couldn&apos;t find your account.</p>
        </div>
      </div>
    );
  }

  const getCountryName = (countryCode: string) => {
    const countries: Record<string, string> = {
      US: "United States",
      CA: "Canada",
      GB: "United Kingdom",
      DE: "Germany",
      FR: "France",
      JP: "Japan",
      CN: "China",
      AU: "Australia",
      SG: "Singapore",
      HK: "Hong Kong",
      KR: "South Korea",
      TW: "Taiwan",
      TH: "Thailand",
    };
    return countries[countryCode] || countryCode;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/account"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back to Account</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-100/50 p-5 sticky top-8">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="font-semibold text-slate-900 text-sm leading-tight">My Account</h2>
                <p className="text-xs text-slate-500 leading-tight">Manage your settings</p>
              </div>

              <nav className="space-y-1">
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/account/orders"
                  className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Orders</span>
                </Link>
                <Link
                  href="/account/settings"
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium"
                >
                  <Globe className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-100/50 p-5">
              <h1 className="text-lg font-bold text-slate-900 mb-1">Account Settings</h1>
              <p className="text-xs text-slate-500 mb-5">Manage your personal information and preferences</p>

              <div className="space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    Personal Information
                  </h2>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                        <p className="font-semibold text-slate-900 text-sm">{user.firstName} {user.lastName}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                        <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {user.email || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    Regional Settings
                  </h2>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Country</label>
                        <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          {getCountryName(user.country || "US")}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
                        <p className="font-semibold text-slate-900 text-sm">{user.currency}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Account Security</h2>
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">Change Password</p>
                        <p className="text-xs text-slate-500">Update your account password</p>
                      </div>
                      <Link
                      href="/account/settings"
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Change
                    </Link>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Account Actions</h2>
                  <div className="space-y-3">
                    <div className="w-full bg-red-50 text-red-600 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Delete Account</p>
                        <p className="text-xs text-red-500">Permanently delete your account and all data</p>
                      </div>
                      <span className="text-xs font-medium">Delete</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
