-- Brand / ModelPrice 的供应商关联改为可选
-- 品牌可由管理员直接创建，不再强制归属供应商；型号价格同步允许空供应商
ALTER TABLE "Brand" ALTER COLUMN "supplierId" DROP NOT NULL;
ALTER TABLE "ModelPrice" ALTER COLUMN "supplierId" DROP NOT NULL;
