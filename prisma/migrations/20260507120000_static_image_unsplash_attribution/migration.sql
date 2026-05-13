-- AlterTable
ALTER TABLE "StaticImage" ADD COLUMN     "photographerName" TEXT,
ADD COLUMN     "photographerProfileUrl" VARCHAR(2048),
ADD COLUMN     "unsplashPhotoPageUrl" VARCHAR(2048);
