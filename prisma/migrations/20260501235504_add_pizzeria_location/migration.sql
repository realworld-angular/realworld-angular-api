-- AlterTable: add location columns (nullable first for existing rows)
ALTER TABLE "Pizzeria" ADD COLUMN "city" VARCHAR(120),
ADD COLUMN "country" VARCHAR(120);

UPDATE "Pizzeria" SET "city" = 'Unknown', "country" = 'Unknown' WHERE "city" IS NULL OR "country" IS NULL;

ALTER TABLE "Pizzeria" ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL;
