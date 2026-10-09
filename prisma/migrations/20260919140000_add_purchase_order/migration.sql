-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "poId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT,
    "salesOrderId" TEXT,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "poStatus" TEXT NOT NULL DEFAULT 'ordered',
    "orderTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("poId")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "itemId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "model" TEXT,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockStatus" TEXT NOT NULL DEFAULT 'in_stock',
    "leadTime" TEXT,
    "itemStatus" TEXT NOT NULL DEFAULT 'ordered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("itemId")
);

-- Add columns to SalesOrder
ALTER TABLE "SalesOrder" ADD COLUMN "soStatus" TEXT DEFAULT 'ordered';

-- Add columns to SalesOrderItem
ALTER TABLE "SalesOrderItem" ADD COLUMN "stockStatus" TEXT;
ALTER TABLE "SalesOrderItem" ADD COLUMN "leadTime" TEXT;
ALTER TABLE "SalesOrderItem" ADD COLUMN "itemStatus" TEXT DEFAULT 'ordered';

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_poNumber_idx" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_poId_idx" ON "PurchaseOrderItem"("poId");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("supplierId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("orderId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("poId") ON DELETE CASCADE ON UPDATE CASCADE;
