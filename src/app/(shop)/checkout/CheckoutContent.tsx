"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateOrderShippingAndPay, toggleOrderComponentPaid, withdrawOrderToCart, confirmReceipt, submitOrder, requestOrderCancel } from "@/app/actions/orderActions";
import { formatUSD } from "@/lib/price";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { Package, Undo2, Check, Upload, FileDown, XCircle, Send, Wallet } from "lucide-react";
import {
  STATUS_META,
  canSubmit as canSubmitFor,
  canWithdraw as canWithdrawFor,
  isCancelPending,
  resolveOrderLifecycle,
} from "@/app/actions/order/status-machine";
import type { OrderWithItems } from "@/app/actions/orderActions";
import { OrderTermsSelect } from "@/components/order/OrderTermsSelect";
import {
  DELIVERY_TERMS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
} from "@/lib/order-terms";

interface CheckoutContentProps {
  order: NonNullable<OrderWithItems>;
  /** 从 session 预填收货联系人姓名 */
  defaultName?: string;
  /** 客户最近一次填写的收货信息，作为输入框灰色提示 */
  savedShipping?: {
    contactName?: string | null;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
    address?: string | null;
    zip?: string | null;
    notes?: string | null;
  } | null;
}

const MAX_FIELD_LENGTHS = {
  shippingCity: 100,
  shippingAddress: 200,
  shippingZip: 20,
  shippingName: 100,
  shippingPhone: 30,
  notes: 500,
};

const DEBOUNCE_DELAY = 1000;

export function CheckoutContent({ order, defaultName, savedShipping }: CheckoutContentProps) {
  // 表单（左栏：地址 / 支付方式 / 备注；右栏：运费税费数值）
  const [formData, setFormData] = useState({
    shippingCountry: order.shippingCountry || savedShipping?.country || "US",
    shippingCity: order.shippingCity || "",
    shippingAddress: order.shippingAddress || "",
    shippingZip: order.shippingZip || "",
    shippingName: order.shippingName || defaultName || "",
    shippingPhone: order.shippingPhone || "",
    notes: order.customerNote || "",
    shippingCost: String(order.shippingCost ?? 0),
    taxAmount: String(order.taxAmount ?? 0),
  });

  // 本次需支付的组件（已付组件自动排除；Tax 行已移除，随订单一并结清）
  const paySubtotal = !order.subtotalPaid;
  const payShipping = !order.shippingPaid;
  const payTax = true;

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Pay 按钮本地即时颜色：点击后立刻切换，不刷新页面、不移动布局
  const [paidLocal, setPaidLocal] = useState({
    subtotal: order.subtotalPaid,
    shipping: order.shippingPaid,
  });
  // 外部数据刷新（如上传水单）时同步一次：渲染期对比 props，避免 effect 级联渲染
  const [paidSnapshot, setPaidSnapshot] = useState({
    subtotal: order.subtotalPaid,
    shipping: order.shippingPaid,
  });
  if (paidSnapshot.subtotal !== order.subtotalPaid || paidSnapshot.shipping !== order.shippingPaid) {
    setPaidSnapshot({ subtotal: order.subtotalPaid, shipping: order.shippingPaid });
    setPaidLocal({ subtotal: order.subtotalPaid, shipping: order.shippingPaid });
  }
  const [slipLoading, setSlipLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [bankDetailsOpen, setBankDetailsOpen] = useState(false);
  const slipInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const lastSubmitRef = useRef(0);

  // 从订单明细计算小计
  const subtotal = Number(order.subtotal);
  // All Charges 由管理后台填写，买家端只读展示
  const shippingCost = Number(order.shippingCost) || 0;

  const allPaid = order.subtotalPaid && order.shippingPaid && order.taxPaid;
  const hasAnySelection = paySubtotal || payShipping;

  // 客户侧订单生命周期：Draft（未提交）/ Pending / Rejected / Approved / Cancelled
  const lifecycle = resolveOrderLifecycle(order);
  const canWithdraw = canWithdrawFor(order);
  const canSubmitNow = canSubmitFor(order);
  const canCancelRequest = lifecycle === "approved";
  const cancelRequested = isCancelPending(order);

  /**
   * 最终生效的收货信息：输入框留空时回落到客户最近一次记录
   * （占位提示即上次的地址，不输入也能直接提交）
   */
  const resolveShipping = () => ({
    shippingCountry: (formData.shippingCountry || "").toUpperCase(),
    shippingCity: formData.shippingCity.trim() || savedShipping?.city || "",
    shippingAddress: formData.shippingAddress.trim() || savedShipping?.address || "",
    shippingZip: formData.shippingZip.trim() || savedShipping?.zip || "",
    shippingName: formData.shippingName.trim() || savedShipping?.contactName || defaultName || "",
    shippingPhone: formData.shippingPhone.trim() || savedShipping?.phone || "",
  });

  const validateForm = () => {
    const shipping = resolveShipping();
    if (!shipping.shippingCountry || !/^[A-Z]{2}$/.test(shipping.shippingCountry)) {
      return "Please select a valid country";
    }
    if (!shipping.shippingCity || shipping.shippingCity.length > MAX_FIELD_LENGTHS.shippingCity) {
      return "Please enter a valid city name";
    }
    if (!shipping.shippingAddress || shipping.shippingAddress.length > MAX_FIELD_LENGTHS.shippingAddress) {
      return "Please enter a valid address";
    }
    if (!shipping.shippingZip || shipping.shippingZip.length > MAX_FIELD_LENGTHS.shippingZip) {
      return "Please enter a valid ZIP/Postal code";
    }
    if (!shipping.shippingName || shipping.shippingName.length > MAX_FIELD_LENGTHS.shippingName) {
      return "Please enter a valid recipient name";
    }
    if (shipping.shippingPhone && shipping.shippingPhone.length > MAX_FIELD_LENGTHS.shippingPhone) {
      return "Phone number is too long";
    }
    if (formData.notes && formData.notes.length > MAX_FIELD_LENGTHS.notes) {
      return "Order notes are too long";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;
    if (!hasAnySelection) {
      setError("No items selected for payment.");
      return;
    }

    const now = Date.now();
    if (now - lastSubmitRef.current < DEBOUNCE_DELAY) {
      setError("Please wait a moment before submitting again.");
      return;
    }
    lastSubmitRef.current = now;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const result = await updateOrderShippingAndPay(order.orderId, {
        ...resolveShipping(),
        notes: formData.notes.trim() || savedShipping?.notes || "",
        shippingCost: formData.shippingCost,
        taxAmount: formData.taxAmount,
        paySubtotal: paySubtotal && !order.subtotalPaid,
        payShipping: payShipping && !order.shippingPaid,
        payTax: payTax && !order.taxPaid,
      });

      if (result.success) {
        setSuccess(result.message);
        // 支付只就地刷新状态颜色，不跳转页面
        router.refresh();
        setIsLoading(false);
      } else {
        setError(result.message);
        setIsLoading(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again later.");
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (isLoading) return;
    if (!window.confirm("Submit a cancellation request for this order? The order stays visible until an admin approves it.")) return;
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await requestOrderCancel(order.orderId);
      if (result.success) {
        setSuccess(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to submit the cancellation request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (isLoading) return;
    if (!window.confirm("Withdraw this order? All items will be returned to your cart.")) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await withdrawOrderToCart(order.orderId);
      if (result.success) {
        setSuccess("Order withdrawn. Redirecting to cart...");
        setTimeout(() => router.push("/cart"), 800);
      } else {
        setError(result.message);
        setIsLoading(false);
      }
    } catch {
      setError("Failed to withdraw. Please try again.");
      setIsLoading(false);
    }
  };

  /** 逐项切换支付状态：点击标记已付，再点一次撤销（误点可回退） */
  const handleToggleComponent = (component: "subtotal" | "shipping") => {
    const currentPaid = component === "subtotal" ? paidLocal.subtotal : paidLocal.shipping;
    const nextPaid = !currentPaid;

    // 先就地切换颜色（不动页面、不显示提示），后台异步保存标记
    setPaidLocal((prev) => ({ ...prev, [component]: nextPaid }));
    void toggleOrderComponentPaid(order.orderId, component, nextPaid).catch(() => {});
  };

  /** 客户确认收货（后台记录确认时间；状态由管理员在后台改为 Received） */
  const handleConfirmReceipt = async () => {
    if (isLoading || slipLoading) return;
    setError("");
    setSuccess("");
    setIsLoading(true);
    try {
      const result = await confirmReceipt(order.orderId);
      if (result.success) {
        setSuccess(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to confirm receipt. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /** 下载单证：按本订单数据生成 PI + 销售合同 + 商业发票 + 装箱单（合并 PDF） */
  const handleDownloadDocuments = async () => {
    if (docsLoading) return;
    setError("");
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/order-documents?orderId=${encodeURIComponent(order.orderId)}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message || "Failed to generate the documents.");
        return;
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const matched = /filename="([^"]+)"/.exec(disposition);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = matched?.[1] || `${order.orderNumber}-Documents.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download documents. Please try again.");
    } finally {
      setDocsLoading(false);
    }
  };

  /** 上传转账水单 → 邮件发送成功后，把当前勾选的费用项标记为已付款 */
  const handleSlipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || isLoading || slipLoading || allPaid) return;

    if (!hasAnySelection) {
      setError("Select at least one item to pay before uploading a slip.");
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setSlipLoading(true);

    try {
      const body = new FormData();
      body.append("orderId", order.orderId);
      body.append("file", file);

      const res = await fetch("/api/payment-slip", { method: "POST", body });
      const data = (await res.json().catch(() => ({ success: false, message: "Upload failed." }))) as {
        success?: boolean;
        message?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to upload the bank slip.");
        return;
      }

      const result = await updateOrderShippingAndPay(order.orderId, {
        ...resolveShipping(),
        notes: formData.notes.trim() || savedShipping?.notes || "",
        shippingCost: formData.shippingCost,
        taxAmount: formData.taxAmount,
        paySubtotal: paySubtotal && !order.subtotalPaid,
        payShipping: payShipping && !order.shippingPaid,
        payTax: payTax && !order.taxPaid,
      });

      if (result.success) {
        setSuccess(
          result.order?.subtotalPaid && result.order?.shippingPaid && result.order?.taxPaid
            ? "Bank slip uploaded — payment marked as paid."
            : "Bank slip uploaded — selected items marked as paid."
        );
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to upload the bank slip. Please try again.");
    } finally {
      setSlipLoading(false);
    }
  };

  // Submit：提交订单。全部 Self → 自动 Approved；否则 Pending 等管理员确认
  const [submitLoading, setSubmitLoading] = useState(false);
  const handleSubmitOrder = async () => {
    if (submitLoading || isLoading) return;
    setSubmitLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await submitOrder(order.orderId, {
        ...resolveShipping(),
        notes: formData.notes.trim() || savedShipping?.notes || "",
      });
      if (result.success) {
        setSuccess(result.message);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to submit the order. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const labelClass = "block text-[11px] font-semibold text-slate-700 mb-0";
  const cardClass = "border border-slate-200 rounded bg-white p-3";
  const compactInputClass =
    "w-full border border-slate-300 rounded px-1.5 py-0.5 text-[11px] text-slate-900 focus:outline-none focus:border-[#336633] focus:ring-1 focus:ring-[#336633]";
  /** 占位提示：新用户浅灰；老客户回填历史记录用深灰（输入内容本身为黑色） */
  const inputClass = (deepPlaceholder = false) =>
    `${compactInputClass} ${deepPlaceholder ? "placeholder:text-slate-500" : "placeholder:text-slate-300"}`;

  // 支付渠道信息（未配置时不虚构银行账户或支付链接）
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  const xTransferDetails = (process.env.NEXT_PUBLIC_XTRANSFER_BANK_DETAILS ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const airwallexPayUrl = process.env.NEXT_PUBLIC_AIRWALLEX_PAY_URL?.trim();

  return (
    <div className="flex-1 min-h-0 overflow-y-scroll main-scrollbar">
      <div className="h-0.5 bg-amber-400 shrink-0"></div>
      <div className="px-2 sm:px-3 pt-1.5 pb-4">
        {/* 标题 */}
        <div className="mb-2 flex items-center gap-2">
          <Package className="w-5 h-5 text-[#336633]" />
          <h1 className="text-base font-bold text-slate-900">Order &amp; Payment</h1>
        </div>

        {error && (
          <div className="mb-2 px-3 py-1.5 rounded border border-rose-200 bg-rose-50 text-[11px] text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-2 px-3 py-1.5 rounded border border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
          {/* ===== 左侧：Shipping Address + Payment Method ===== */}
          <div className="lg:col-span-1 space-y-2">
            {/* Shipping Address */}
            <div className="border border-slate-200 rounded bg-white p-2">
              <h2 className="text-[12px] font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#336633]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Shipping Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5">
                <div>
                  <label className={labelClass}>Full Name <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shippingName} onChange={(e) => setFormData({ ...formData, shippingName: e.target.value })} className={inputClass(!!savedShipping?.contactName)} placeholder={savedShipping?.contactName || "John Doe"} />
                </div>
                <div>
                  <label className={labelClass}>Contact Details</label>
                  <input type="tel" value={formData.shippingPhone} onChange={(e) => setFormData({ ...formData, shippingPhone: e.target.value })} className={inputClass(!!savedShipping?.phone)} placeholder={savedShipping?.phone || "+1 234 567 8900"} />
                </div>
                <div>
                  <label className={labelClass}>Country/Region <span className="text-rose-500">*</span></label>
                  <select value={formData.shippingCountry} onChange={(e) => setFormData({ ...formData, shippingCountry: e.target.value })} className={`${inputClass()} cursor-pointer`}>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>City <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shippingCity} onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })} className={inputClass(!!savedShipping?.city)} placeholder={savedShipping?.city || "New York"} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Address <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shippingAddress} onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })} className={inputClass(!!savedShipping?.address)} placeholder={savedShipping?.address || "123 Main Street"} />
                </div>
                <div>
                  <label className={labelClass}>ZIP <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shippingZip} onChange={(e) => setFormData({ ...formData, shippingZip: e.target.value })} className={inputClass(!!savedShipping?.zip)} placeholder={savedShipping?.zip || "10001"} />
                </div>
                <div>
                  <label className={labelClass}>Port of Destination</label>
                  <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={inputClass(!!savedShipping?.notes)} placeholder={savedShipping?.notes || "Optional"} />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className={cardClass}>
              <h2 className="text-[12px] font-bold text-slate-900 mb-2 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-[#336633]" />
                Payment &amp; Delivery
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payment-methods.png" alt="Payment Methods" className="w-2/3 mx-auto h-auto mb-2 object-contain" />
              <div className="space-y-1.5">
                {/* Payment Terms */}
                <div className="rounded border border-slate-200 bg-slate-50 p-2">
                  <p className="text-[13px] font-bold text-slate-900 mb-1">Payment Terms</p>
                  <div className="flex items-center gap-2">
                    <OrderTermsSelect
                      orderId={order.orderId}
                      field="paymentTerms"
                      options={PAYMENT_TERMS_OPTIONS}
                      value={order.paymentTerms ?? null}
                      locked={order.paymentTermsSetByAdmin}
                      mode="customer"
                      compact
                      className="w-[60%]"
                    />
                    <span className="ml-auto shrink-0 w-[160px] invisible" aria-hidden="true" />
                  </div>
                </div>

                {/* Payment Method + XTransfer 银行信息 */}
                <div className="rounded border border-slate-200 bg-slate-50 p-2">
                  <p className="text-[13px] font-bold text-slate-900 mb-1">Payment Method</p>
                  <div className="flex items-center gap-2">
                    <OrderTermsSelect
                      orderId={order.orderId}
                      field="paymentMethod"
                      options={PAYMENT_METHOD_OPTIONS}
                      value={order.paymentMethod ?? null}
                      locked={order.paymentMethodSetByAdmin}
                      mode="customer"
                      compact
                      className="w-[60%]"
                    />
                    <button
                      type="button"
                      onClick={() => setBankDetailsOpen((v) => !v)}
                      className="ml-auto shrink-0 w-[160px] whitespace-nowrap inline-flex items-center justify-center px-2 py-0.5 bg-[#336633] text-white text-[11px] font-bold rounded hover:bg-[#2d5a2d] transition-colors"
                    >
                      View Bank Details
                    </button>
                  </div>
                  {bankDetailsOpen && (
                    <div className="mt-1.5 rounded border border-slate-200 bg-white p-2">
                      {xTransferDetails.length > 0 ? (
                        <ul className="space-y-0.5">
                          {xTransferDetails.map((line) => (
                            <li key={line} className="text-[11px] text-slate-700 font-mono break-all">{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Bank details will be shared by the seller after order confirmation. Please contact the seller
                          {whatsappNumber ? (
                            <>
                              {" "}
                              <a
                                href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#128c7e] font-semibold underline"
                              >
                                via WhatsApp
                              </a>
                            </>
                          ) : null}
                          .
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery Terms + Airwallex 支付入口 */}
                <div className="rounded border border-slate-200 bg-slate-50 p-2">
                  <p className="text-[13px] font-bold text-slate-900 mb-1">Delivery Terms</p>
                  <div className="flex items-center gap-2">
                    <OrderTermsSelect
                      orderId={order.orderId}
                      field="deliveryTerms"
                      options={DELIVERY_TERMS_OPTIONS}
                      value={order.deliveryTerms ?? null}
                      locked={order.deliveryTermsSetByAdmin}
                      mode="customer"
                      compact
                      className="w-[60%]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (airwallexPayUrl) {
                          window.open(airwallexPayUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                      disabled={!airwallexPayUrl}
                      title={airwallexPayUrl ? undefined : "Airwallex payment link is not configured"}
                      className="ml-auto shrink-0 w-[160px] whitespace-nowrap inline-flex items-center justify-center px-2 py-0.5 bg-[#336633] text-white text-[11px] font-bold rounded hover:bg-[#2d5a2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Pay Now via Airwallex
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 右侧：Order Summary ===== */}
          <div className="lg:col-span-1">
            <div className={`${cardClass} lg:sticky lg:top-1`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">Order Summary</h3>
                <span className="text-[13px] font-bold text-slate-800">
                  Sales Order<span className="text-slate-400 mx-1">：</span>
                  <span className="text-[#336633] tracking-wide">{order.orderNumber}</span>
                </span>
              </div>

              <div className="mb-2 max-h-56 overflow-y-auto pr-1">
                <table className="w-full table-fixed text-[12px]">
                  <colgroup>
                    <col className="w-[27%]" />
                    <col className="w-[13%]" />
                    <col className="w-[10%]" />
                    <col className="w-[14%]" />
                    <col className="w-[10%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="px-1.5 py-1 text-left">Model</th>
                      <th className="px-1.5 py-1 text-left">Price</th>
                      <th className="px-1.5 py-1 text-left">Qty</th>
                      <th className="px-1.5 py-1 text-left">Amount</th>
                      <th className="px-1.5 py-1 text-left">Self</th>
                      <th className="px-1.5 py-1 text-left">Condition</th>
                      <th className="px-1.5 py-1 text-left">Leadtime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item) => {
                      const unitPrice = Number(item.unitPrice);
                      const itemTotal = Number(item.subtotal);
                      return (
                        <tr key={item.itemId} className="hover:bg-slate-50">
                          <td className="px-1.5 py-1 text-left font-medium text-slate-900 truncate">{item.model || item.productName || "—"}</td>
                          <td className="px-1.5 py-1 text-left text-slate-700">{formatUSD(unitPrice)}</td>
                          <td className="px-1.5 py-1 text-left text-slate-700">{item.quantity}</td>
                          <td className="px-1.5 py-1 text-left font-semibold text-slate-900">{formatUSD(itemTotal)}</td>
                          <td className="px-1.5 py-1 text-left">
                            {item.requiresManualConfirm ? (
                              <span className="text-[10px] font-semibold text-amber-600">Manual</span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-600">Yes</span>
                            )}
                          </td>
                          <td className="px-1.5 py-1 text-left text-slate-700 truncate">{item.modelPrice?.condition || "—"}</td>
                          <td className="px-1.5 py-1 text-left text-slate-700 truncate">{item.modelPrice?.leadTime || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 费用行 — 与上方明细表列宽对齐 */}
              <table className="w-full table-fixed text-[12px] border-t border-slate-100">
                <colgroup>
                  <col className="w-[27%]" />
                  <col className="w-[13%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="px-1.5 py-1" />
                    <td colSpan={2} className="px-1.5 py-1 text-left align-middle text-[14px] font-normal whitespace-nowrap text-black">Goods Subtotal</td>
                    <td className={`px-1.5 py-1 text-left align-middle text-[14px] font-normal ${paidLocal.subtotal ? "text-emerald-600 line-through" : "text-black"}`}>
                      {formatUSD(subtotal)}
                    </td>
                    <td className="px-1.5 py-1 text-left align-middle">
                      <button
                        type="button"
                        onClick={() => handleToggleComponent("subtotal")}
                        title={paidLocal.subtotal ? "Click to undo" : "Mark as paid"}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                          paidLocal.subtotal
                            ? "bg-emerald-300 text-white hover:bg-emerald-400"
                            : "bg-amber-600 text-white hover:bg-amber-700"
                        }`}
                      >
                        Pay
                      </button>
                    </td>
                    <td className="px-1.5 py-1" />
                    <td className="px-1.5 py-1" />
                  </tr>
                  <tr>
                    <td className="px-1.5 py-1 text-left align-middle">
                      {/* 订单状态框：Draft / Pending / Rejected / Approved / Cancelled */}
                      <span
                        className="inline-flex items-center justify-center px-3 py-1 text-[14px] font-bold text-white rounded shadow-sm whitespace-nowrap"
                        style={{ backgroundColor: STATUS_META[lifecycle].color }}
                        title={`Order status: ${STATUS_META[lifecycle].label}`}
                      >
                        {STATUS_META[lifecycle].label}
                      </span>
                    </td>
                    <td colSpan={2} className="px-1.5 py-1 text-left align-middle text-[14px] font-normal whitespace-nowrap text-black">All Charges</td>
                    <td className="px-1.5 py-1 text-left align-middle">
                      <span className={`text-[14px] font-normal ${paidLocal.shipping ? "text-emerald-600 line-through" : "text-black"}`}>
                        {formatUSD(shippingCost)}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 text-left align-middle">
                      <button
                        type="button"
                        onClick={() => handleToggleComponent("shipping")}
                        title={paidLocal.shipping ? "Click to undo" : "Mark as paid"}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                          paidLocal.shipping
                            ? "bg-emerald-300 text-white hover:bg-emerald-400"
                            : "bg-amber-600 text-white hover:bg-amber-700"
                        }`}
                      >
                        Pay
                      </button>
                    </td>
                    <td className="px-1.5 py-1" />
                    <td className="px-1.5 py-1" />
                  </tr>
                  <tr>
                    <td className="px-1.5 py-1" />
                    <td colSpan={2} className="px-1.5 py-1 text-left align-middle text-[14px] font-semibold whitespace-nowrap text-black">Total</td>
                    <td className="px-1.5 py-1 text-left align-middle text-[14px] font-semibold text-black">
                      {formatUSD(subtotal + shippingCost)}
                    </td>
                    <td className="px-1.5 py-1 text-left align-middle" />
                    <td className="px-1.5 py-1" />
                    <td className="px-1.5 py-1" />
                  </tr>
                </tbody>
              </table>

              {/* 六个等宽按钮框：同一行排满 */}
              <div className="mt-2 grid grid-cols-6 gap-1">
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitLoading || isLoading || !canSubmitNow}
                  className="w-full min-w-0 py-2 bg-[#336633] text-white text-[12px] font-semibold rounded hover:bg-[#2d5a2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-0.5 leading-tight text-center"
                  title={order.auditStatus === "rejected" ? "Resubmit order for approval" : "Submit order for approval"}
                >
                  {submitLoading ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDocuments}
                  disabled={isLoading || slipLoading || docsLoading}
                  className="w-full min-w-0 py-2 bg-sky-50 border border-sky-200 text-sky-700 text-[12px] font-semibold rounded hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-0.5 leading-tight text-center"
                  title="Download customs documents"
                >
                  {docsLoading ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-sky-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  Documents
                </button>
                <button
                  type="button"
                  onClick={() => slipInputRef.current?.click()}
                  disabled={isLoading || slipLoading || allPaid || !hasAnySelection}
                  className="w-full min-w-0 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold rounded hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-0.5 leading-tight text-center"
                  title="Upload bank transfer slip"
                >
                  {slipLoading ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-emerald-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Slip
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReceipt}
                  disabled={isLoading || slipLoading || order.orderStatus === "completed" || order.orderStatus === "cancelled" || !!order.deliveredAt}
                  className="w-full min-w-0 py-2 bg-[#336633] text-white text-[12px] font-semibold rounded hover:bg-[#2d5a2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-0.5 leading-tight text-center"
                  title={order.deliveredAt ? "Handover already confirmed" : "Confirm handover"}
                >
                  <Check className="w-4 h-4" />
                  Confirm Handover
                </button>
                {canWithdraw && (
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={isLoading || allPaid}
                    className="w-full min-w-0 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-[12px] font-semibold rounded hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-0.5 leading-tight text-center"
                    title="Withdraw this order and return items to cart"
                  >
                    <Undo2 className="w-4 h-4" />
                    Withdraw
                  </button>
                )}
                {canCancelRequest && (
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    disabled={isLoading || cancelRequested}
                    className="w-full min-w-0 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] font-semibold rounded hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-0.5 leading-tight text-center"
                    title={
                      cancelRequested
                        ? "Cancellation requested — waiting for admin approval"
                        : "Request order cancellation"
                    }
                  >
                    <XCircle className="w-4 h-4" />
                    {cancelRequested ? "Cancel Requested" : "Cancel Request"}
                  </button>
                )}
                <input
                  ref={slipInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleSlipFile}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
