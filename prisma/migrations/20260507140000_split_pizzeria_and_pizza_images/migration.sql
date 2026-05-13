-- CreateTable
CREATE TABLE "PizzeriaImage" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "photographerName" TEXT,
    "photographerProfileUrl" VARCHAR(2048),
    "unsplashPhotoPageUrl" VARCHAR(2048),

    CONSTRAINT "PizzeriaImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PizzaImage" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "photographerName" TEXT,
    "photographerProfileUrl" VARCHAR(2048),
    "unsplashPhotoPageUrl" VARCHAR(2048),

    CONSTRAINT "PizzaImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PizzeriaImage_filename_key" ON "PizzeriaImage"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "PizzaImage_filename_key" ON "PizzaImage"("filename");

-- DropForeignKey
ALTER TABLE "Pizzeria" DROP CONSTRAINT "Pizzeria_imageId_fkey";

-- DropForeignKey
ALTER TABLE "Pizza" DROP CONSTRAINT "Pizza_imageId_fkey";

-- Data migration: split StaticImage by category, preserve ids for existing FKs on Pizzeria/Pizza
INSERT INTO "PizzeriaImage" ("id", "filename", "altText", "photographerName", "photographerProfileUrl", "unsplashPhotoPageUrl")
SELECT "id", "filename", "altText", "photographerName", "photographerProfileUrl", "unsplashPhotoPageUrl"
FROM "StaticImage" WHERE "category" = 'PIZZERIA';

INSERT INTO "PizzaImage" ("id", "filename", "altText", "photographerName", "photographerProfileUrl", "unsplashPhotoPageUrl")
SELECT "id", "filename", "altText", "photographerName", "photographerProfileUrl", "unsplashPhotoPageUrl"
FROM "StaticImage" WHERE "category" = 'PIZZA';

-- DropTable
DROP TABLE "StaticImage";

-- AddForeignKey
ALTER TABLE "Pizzeria" ADD CONSTRAINT "Pizzeria_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "PizzeriaImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pizza" ADD CONSTRAINT "Pizza_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "PizzaImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropEnum
DROP TYPE "ImageCategory";
