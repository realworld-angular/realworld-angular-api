-- Toppings catalog: `priceModifier` → `price`.
ALTER TABLE "PizzaToppingOption" RENAME COLUMN "priceModifier" TO "price";
