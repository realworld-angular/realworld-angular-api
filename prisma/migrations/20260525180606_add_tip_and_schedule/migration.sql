-- Add tipAmount and scheduledAt columns to Order
ALTER TABLE "Order" ADD COLUMN "tipAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "scheduledAt" TIMESTAMP(3);
