-- Migration: Add supplier/customer profile fields
-- Supplier: country, phone, address, website, paymentTerm, currency, taxId, bankInfo
-- Customer: city, address, zip, paymentMethod
-- 所有新列均可空（存量数据显示为 —），由注册表单逐步采集。

-- Supplier 扩展商务档案字段
ALTER TABLE "Supplier" ADD COLUMN "country" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "phone" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "address" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "website" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "paymentTerm" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "currency" TEXT DEFAULT 'USD';
ALTER TABLE "Supplier" ADD COLUMN "taxId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "bankInfo" TEXT;

-- Customer 扩展收货/支付档案字段
ALTER TABLE "Customer" ADD COLUMN "city" TEXT;
ALTER TABLE "Customer" ADD COLUMN "address" TEXT;
ALTER TABLE "Customer" ADD COLUMN "zip" TEXT;
ALTER TABLE "Customer" ADD COLUMN "paymentMethod" TEXT;
