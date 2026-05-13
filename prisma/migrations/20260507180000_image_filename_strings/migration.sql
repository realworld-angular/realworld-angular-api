-- Store image basenames only; images are served as static files from the Angular app.
-- Note: Unsplash attribution / image tables removed.

-- 1) Add new columns (nullable for backfill)
ALTER TABLE "Pizzeria" ADD COLUMN "imageFilename" VARCHAR(255);
ALTER TABLE "Pizza" ADD COLUMN "imageFilename" VARCHAR(255);

-- 2) Backfill from existing image tables
UPDATE "Pizzeria" p SET "imageFilename" = pi."filename"
FROM "PizzeriaImage" pi
WHERE p."imageId" = pi."id";

UPDATE "Pizza" pz SET "imageFilename" = pi."filename"
FROM "PizzaImage" pi
WHERE pz."imageId" = pi."id";

-- 3) Drop FKs to image tables
ALTER TABLE "Pizzeria" DROP CONSTRAINT IF EXISTS "Pizzeria_imageId_fkey";
ALTER TABLE "Pizza" DROP CONSTRAINT IF EXISTS "Pizza_imageId_fkey";

-- 4) Drop old columns
ALTER TABLE "Pizzeria" DROP COLUMN "imageId";
ALTER TABLE "Pizza" DROP COLUMN "imageId";

-- 5) Enforce NOT NULL
ALTER TABLE "Pizzeria" ALTER COLUMN "imageFilename" SET NOT NULL;
ALTER TABLE "Pizza" ALTER COLUMN "imageFilename" SET NOT NULL;

-- 6) Drop dedicated image catalog tables
DROP TABLE IF EXISTS "PizzeriaImage";
DROP TABLE IF EXISTS "PizzaImage";
