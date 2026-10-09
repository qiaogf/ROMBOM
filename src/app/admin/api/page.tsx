import { prisma } from "@/lib/prisma";
import { ApiAccountTable } from "./_components/ApiAccountTable";

export const dynamic = "force-dynamic";

export default async function ApiPage() {
  // 并行加载：API 账户 / 可绑定客户 / 品牌-系列树
  const [accounts, customers, brands] = await Promise.all([
    prisma.apiAccount.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        apiAccountId: true,
        customerId: true,
        customerName: true,
        email: true,
        apiKey: true,
        brandSeriesFilter: true,
        markupRate: true,
        quotaPerMinute: true,
        isActive: true,
      },
    }),
    // 可绑定客户：isActive=true 且未绑定密钥（apiAccount 为空）
    prisma.customer.findMany({
      where: { isActive: true, apiAccount: { is: null } },
      select: {
        customerId: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
      },
      orderBy: { email: "asc" },
    }),
    // 品牌 + 系列树（仅 isActive 的 brand/series）
    prisma.brand.findMany({
      where: { isActive: true },
      select: {
        brandId: true,
        brandName: true,
        series: {
          where: { isActive: true },
          select: { seriesId: true, seriesName: true },
          orderBy: { seriesName: "asc" },
        },
      },
      orderBy: { brandName: "asc" },
    }),
  ]);

  // Decimal 序列化（Prisma Decimal → number）
  const accountData = accounts.map((a) => ({
    ...a,
    markupRate: Number(a.markupRate),
  }));

  return (
    <div className="w-full space-y-3">
      <ApiAccountTable
        accounts={accountData}
        customers={customers}
        brandSeriesOptions={brands}
      />

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-600">API Usage</p>
        <p>
          Endpoint:{" "}
          <code className="text-slate-700">GET /api/model-prices</code>
        </p>
        <p>
          Header:{" "}
          <code className="text-slate-700">
            x-api-key: {"{account API key}"}
          </code>
        </p>
        <p>
          Params:{" "}
          <code className="text-slate-700">
            ?model=xxx&limit=100&offset=0
          </code>
        </p>
        <p className="text-slate-400">
          Markup rate is applied to cost price. Brand series filter limits
          visible brands. Empty filter = all brands.
        </p>
      </div>
    </div>
  );
}
