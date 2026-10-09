-- Migration: Add slug field to Brand table
-- SQLite doesn't support ALTER TABLE for columns with UNIQUE, so we need to recreate the table

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Step 1: Create new table with updated schema
CREATE TABLE "new_Brand" (
    "brandId" TEXT NOT NULL PRIMARY KEY,
    "brandName" TEXT NOT NULL UNIQUE,
    "slug" TEXT NOT NULL UNIQUE,
    "logo" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Step 2: Copy data from old table to new table
-- Generate slug from brandName (lowercase, replace spaces with hyphens)
INSERT INTO "new_Brand" ("brandId", "brandName", "slug", "logo", "description", "createdAt", "updatedAt")
SELECT 
    "brandId",
    "brandName",
    LOWER(REPLACE(REPLACE("brandName", ' ', '-'), '&', 'and')) as "slug",
    "logo",
    "description",
    "createdAt",
    "updatedAt"
FROM "Brand";

-- Step 3: Drop old table
DROP TABLE "Brand";

-- Step 4: Rename new table to Brand
ALTER TABLE "new_Brand" RENAME TO "Brand";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
