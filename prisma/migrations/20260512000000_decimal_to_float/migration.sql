-- AlterTable: change all price/monetary columns from DECIMAL(10,2) to DOUBLE PRECISION
-- DOUBLE PRECISION (float8) is sufficient for pizza prices and avoids Prisma's
-- Decimal wrapper, so the API returns plain JS numbers directly.

ALTER TABLE "Pizza" ALTER COLUMN "basePrice" TYPE DOUBLE PRECISION;
ALTER TABLE "PizzaSizeOption" ALTER COLUMN "price" TYPE DOUBLE PRECISION;
ALTER TABLE "PizzaToppingOption" ALTER COLUMN "price" TYPE DOUBLE PRECISION;
ALTER TABLE "Order" ALTER COLUMN "total" TYPE DOUBLE PRECISION;
ALTER TABLE "OrderItem" ALTER COLUMN "unitPrice" TYPE DOUBLE PRECISION;
