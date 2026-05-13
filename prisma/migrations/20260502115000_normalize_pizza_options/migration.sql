-- Drop legacy option tables
DROP TABLE IF EXISTS "PizzaOption";
DROP TABLE IF EXISTS "GlobalOption";

-- OptionType is no longer used
DROP TYPE IF EXISTS "OptionType";

-- CreateTable
CREATE TABLE "PizzaSizeOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceModifier" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PizzaSizeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PizzaToppingOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceModifier" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PizzaToppingOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PizzaSizeOption_label_key" ON "PizzaSizeOption"("label");

-- CreateIndex
CREATE INDEX "PizzaSizeOption_sortOrder_idx" ON "PizzaSizeOption"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PizzaToppingOption_label_key" ON "PizzaToppingOption"("label");

-- CreateIndex
CREATE INDEX "PizzaToppingOption_sortOrder_idx" ON "PizzaToppingOption"("sortOrder");
