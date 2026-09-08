-- Add Day 6 payment methods and controlled statuses without changing existing rows.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ONLINE';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "originalPaymentId" TEXT;

CREATE INDEX IF NOT EXISTS "payments_paymentMethod_idx" ON "payments"("paymentMethod");
CREATE INDEX IF NOT EXISTS "payments_subscriptionId_idx" ON "payments"("subscriptionId");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_originalPaymentId_fkey"
  FOREIGN KEY ("originalPaymentId") REFERENCES "payments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
