-- Seed the SAVE20 coupon code for production (seed.ts is dev-only).
INSERT INTO "CouponCode" ("id", "code", "discountPercent")
SELECT 'clseed000000000000000save20', 'SAVE20', 20
WHERE NOT EXISTS (
  SELECT 1 FROM "CouponCode" WHERE "code" = 'SAVE20'
);
