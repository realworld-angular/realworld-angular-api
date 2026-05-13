-- Add name column to User table (server-generated, immutable, unique).
ALTER TABLE "User" ADD COLUMN "name" TEXT;
UPDATE "User" SET "name" = id WHERE "name" IS NULL;
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
