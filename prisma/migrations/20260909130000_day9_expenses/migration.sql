CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'ELECTRICITY', 'WATER', 'INTERNET', 'EQUIPMENT', 'EQUIPMENT_REPAIR', 'MAINTENANCE', 'CLEANING', 'STAFF', 'MARKETING', 'SUPPLIES', 'SOFTWARE', 'INSURANCE', 'TAX', 'MISCELLANEOUS', 'OTHER');
CREATE TYPE "ExpenseStatus" AS ENUM ('PAID', 'PENDING', 'CANCELLED');

ALTER TABLE "expenses" ADD COLUMN "paymentMethod" "PaymentMethod";
ALTER TABLE "expenses" ADD COLUMN "referenceNumber" TEXT;
ALTER TABLE "expenses" ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'PAID';
CREATE INDEX "expenses_category_idx" ON "expenses"("category");
CREATE INDEX "expenses_status_idx" ON "expenses"("status");