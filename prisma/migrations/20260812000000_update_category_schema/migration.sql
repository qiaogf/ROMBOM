-- Migration: Update Category table schema
-- SQLite doesn't support ALTER TABLE for columns, so we need to recreate the table

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Step 1: Create new table with updated schema
CREATE TABLE "new_Category" (
    "categoryId" TEXT NOT NULL PRIMARY KEY,
    "categoryName" TEXT NOT NULL,
    "parentId" TEXT NOT NULL DEFAULT '0',
    "level" INTEGER NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "briefDesc" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Step 2: Copy data from old table to new table
-- Generate slug from categoryName (lowercase, replace spaces with hyphens)
INSERT INTO "new_Category" ("categoryId", "categoryName", "parentId", "level", "slug", "briefDesc", "sort", "active", "createdAt", "updatedAt")
SELECT 
    "categoryId",
    "categoryName",
    "parentId",
    "level",
    LOWER(REPLACE(REPLACE("categoryName", ' ', '-'), '&', 'and')) as "slug",
    NULL as "briefDesc",
    COALESCE("sortOrder", 0) as "sort",
    COALESCE("isActive", true) as "active",
    "createdAt",
    "updatedAt"
FROM "Category";

-- Step 3: Drop old table
DROP TABLE "Category";

-- Step 4: Rename new table to Category
ALTER TABLE "new_Category" RENAME TO "Category";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
