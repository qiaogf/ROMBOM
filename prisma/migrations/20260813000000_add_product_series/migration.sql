-- Migration: Add series column to Product table
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Step 1: Create new table with updated schema
CREATE TABLE "new_Product" (
    "productId" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "series" TEXT,
    "description" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "thumbnail" TEXT,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'off_sale',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("categoryId") REFERENCES "Category"("categoryId"),
    FOREIGN KEY ("brandId") REFERENCES "Brand"("brandId")
);

-- Step 2: Copy data from old table to new table
INSERT INTO "new_Product" ("productId", "categoryId", "brandId", "productName", "model", "series", "description", "images", "thumbnail", "unit", "status", "sortOrder", "createdAt", "updatedAt")
SELECT 
    "productId",
    "categoryId",
    "brandId",
    "productName",
    "model",
    NULL as "series",
    "description",
    "images",
    "thumbnail",
    "unit",
    "status",
    "sortOrder",
    "createdAt",
    "updatedAt"
FROM "Product";

-- Step 3: Drop old table
DROP TABLE "Product";

-- Step 4: Rename new table to Product
ALTER TABLE "new_Product" RENAME TO "Product";

-- Step 5: Recreate indexes
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX "Product_status_idx" ON "Product"("status");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
