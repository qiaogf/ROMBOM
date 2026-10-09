-- Migration: Add staff number and phone to AdminUser
-- 员工工号与联系电话，均可空（存量管理员显示为 —）。

ALTER TABLE "AdminUser" ADD COLUMN "staffNo" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "phone" TEXT;
