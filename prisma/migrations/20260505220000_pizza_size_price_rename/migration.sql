-- Rename size catalog column to `price` (matches topping options naming).
ALTER TABLE "PizzaSizeOption" RENAME COLUMN "priceModifier" TO "price";
