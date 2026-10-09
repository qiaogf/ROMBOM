-- Migration: Add categoryId to Series table
-- 业务规则：一个系列既属于一个品牌(brandId)，也属于一个品类(categoryId)
-- 说明：生产环境为 PostgreSQL。先以可空列加入，回填后再收紧为 NOT NULL。
-- 回填逻辑由应用层脚本完成（按系列名下产品所在品类 → 品牌主营品类 → 首个活跃品类）。

-- Step 1: 新增可空外键列
ALTER TABLE "Series" ADD COLUMN "categoryId" TEXT;

-- Step 2: 回填（应用层脚本执行；此处保留兜底，将未回填系列关联到首个活跃品类）
UPDATE "Series"
SET "categoryId" = (
    SELECT "Category"."categoryId"
    FROM "Category"
    WHERE "Category"."isActive" = true
    ORDER BY "Category"."sortOrder" ASC
    LIMIT 1
)
WHERE "Category" IS NULL OR "categoryId" IS NULL;

-- Step 3: 收紧为 NOT NULL
ALTER TABLE "Series" ALTER COLUMN "categoryId" SET NOT NULL;

-- Step 4: 外键约束（删除品类时限制删除，避免误删系列）
ALTER TABLE "Series"
ADD CONSTRAINT "Series_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("categoryId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: 索引
CREATE INDEX "Series_categoryId_idx" ON "Series"("categoryId");
