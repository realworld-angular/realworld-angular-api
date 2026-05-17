-- Create OrderItemTopping join table (replaces old selectedOptions JSONB)
CREATE TABLE "OrderItemTopping" (
    "orderItemId" TEXT NOT NULL,
    "toppingId" TEXT NOT NULL,
    CONSTRAINT "OrderItemTopping_pkey" PRIMARY KEY ("orderItemId", "toppingId")
);

ALTER TABLE "OrderItemTopping" ADD CONSTRAINT "OrderItemTopping_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "OrderItemTopping" ADD CONSTRAINT "OrderItemTopping_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "PizzaToppingOption"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Remove old OrderItem columns no longer in the Prisma schema
ALTER TABLE "OrderItem" DROP COLUMN "unitPrice";
ALTER TABLE "OrderItem" DROP COLUMN "selectedOptions";

-- Add new nullable selectedSizeId column with FK
ALTER TABLE "OrderItem" ADD COLUMN "selectedSizeId" TEXT;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_selectedSizeId_fkey" FOREIGN KEY ("selectedSizeId") REFERENCES "PizzaSizeOption"(id) ON UPDATE CASCADE ON DELETE SET NULL;
