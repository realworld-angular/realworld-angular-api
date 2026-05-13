-- Normalize Order delivery/billing: replace single-line VARCHAR columns with
-- street / city / country columns (matching the User address shape).

-- Step 1: add new columns (nullable until backfill completes)
ALTER TABLE "Order" ADD COLUMN "deliveryStreetAddress" VARCHAR(300);
ALTER TABLE "Order" ADD COLUMN "deliveryCity" VARCHAR(120);
ALTER TABLE "Order" ADD COLUMN "deliveryCountry" VARCHAR(120);
ALTER TABLE "Order" ADD COLUMN "billingStreetAddress" VARCHAR(300);
ALTER TABLE "Order" ADD COLUMN "billingCity" VARCHAR(120);
ALTER TABLE "Order" ADD COLUMN "billingCountry" VARCHAR(120);

-- Step 2: backfill from legacy "{street}, {city}, {country}" lines (same rules as the app parser)
DO $$
DECLARE
  r RECORD;
  parts TEXT[];
  n INT;
  delim TEXT := ', ';
  street_part TEXT;
BEGIN
  FOR r IN SELECT id, "deliveryAddress", "billingAddress" FROM "Order" LOOP
    -- Delivery
    parts := string_to_array(trim(r."deliveryAddress"), delim);
    n := COALESCE(array_length(parts, 1), 0);
    IF n >= 3 THEN
      street_part := array_to_string(parts[1 : (n - 2)], delim);
      UPDATE "Order"
      SET
        "deliveryStreetAddress" = LEFT(street_part, 300),
        "deliveryCity" = LEFT(trim(parts[n - 1]), 120),
        "deliveryCountry" = LEFT(trim(parts[n]), 120)
      WHERE id = r.id;
    ELSE
      UPDATE "Order"
      SET
        "deliveryStreetAddress" = LEFT(COALESCE(NULLIF(trim(r."deliveryAddress"), ''), '(unparsed)'), 300),
        "deliveryCity" = 'Unknown',
        "deliveryCountry" = 'Unknown'
      WHERE id = r.id;
    END IF;

    -- Billing (optional; all three null means “same as delivery”)
    IF r."billingAddress" IS NOT NULL AND trim(r."billingAddress") <> '' THEN
      parts := string_to_array(trim(r."billingAddress"), delim);
      n := COALESCE(array_length(parts, 1), 0);
      IF n >= 3 THEN
        street_part := array_to_string(parts[1 : (n - 2)], delim);
        UPDATE "Order"
        SET
          "billingStreetAddress" = LEFT(street_part, 300),
          "billingCity" = LEFT(trim(parts[n - 1]), 120),
          "billingCountry" = LEFT(trim(parts[n]), 120)
        WHERE id = r.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 3: guarantee delivery columns are populated before NOT NULL
UPDATE "Order" SET
  "deliveryStreetAddress" = COALESCE(NULLIF(trim("deliveryStreetAddress"), ''), '(missing)'),
  "deliveryCity" = COALESCE(NULLIF(trim("deliveryCity"), ''), 'Unknown'),
  "deliveryCountry" = COALESCE(NULLIF(trim("deliveryCountry"), ''), 'Unknown')
WHERE
  "deliveryStreetAddress" IS NULL
  OR "deliveryCity" IS NULL
  OR "deliveryCountry" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "deliveryStreetAddress" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "deliveryCity" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "deliveryCountry" SET NOT NULL;

-- Step 4: drop legacy columns
ALTER TABLE "Order" DROP COLUMN "deliveryAddress";
ALTER TABLE "Order" DROP COLUMN "billingAddress";
