-- Drop saved delivery address fields from User.
-- Orders still keep per-order delivery/billing addresses.

ALTER TABLE "User"
DROP COLUMN IF EXISTS "deliveryStreetAddress",
DROP COLUMN IF EXISTS "deliveryCity",
DROP COLUMN IF EXISTS "deliveryCountry";

