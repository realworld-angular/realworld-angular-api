-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'PIZZERIA_ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "name" TEXT NOT NULL,
    "avatarPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pizzeria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "country" VARCHAR(120) NOT NULL,
    "imageFilename" VARCHAR(255) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pizzeria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pizza" (
    "id" TEXT NOT NULL,
    "pizzeriaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "imageFilename" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pizza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PizzaSizeOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PizzaSizeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PizzaToppingOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PizzaToppingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "pizzeriaId" TEXT NOT NULL,
    "deliveryStreetAddress" VARCHAR(300) NOT NULL,
    "deliveryCity" VARCHAR(120) NOT NULL,
    "deliveryCountry" VARCHAR(120) NOT NULL,
    "billingStreetAddress" VARCHAR(300),
    "billingCity" VARCHAR(120),
    "billingCountry" VARCHAR(120),
    "notes" VARCHAR(300),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "pizzaId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selectedSizeId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemTopping" (
    "orderItemId" TEXT NOT NULL,
    "toppingId" TEXT NOT NULL,

    CONSTRAINT "OrderItemTopping_pkey" PRIMARY KEY ("orderItemId","toppingId")
);

-- CreateTable
CREATE TABLE "_PizzaToPizzaToppingOption" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PizzaToPizzaToppingOption_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pizzeria_name_key" ON "Pizzeria"("name");

-- CreateIndex
CREATE INDEX "PizzaSizeOption_sortOrder_idx" ON "PizzaSizeOption"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PizzaSizeOption_label_key" ON "PizzaSizeOption"("label");

-- CreateIndex
CREATE INDEX "PizzaToppingOption_sortOrder_idx" ON "PizzaToppingOption"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PizzaToppingOption_label_key" ON "PizzaToppingOption"("label");

-- CreateIndex
CREATE INDEX "_PizzaToPizzaToppingOption_B_index" ON "_PizzaToPizzaToppingOption"("B");

-- AddForeignKey
ALTER TABLE "Pizzeria" ADD CONSTRAINT "Pizzeria_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pizza" ADD CONSTRAINT "Pizza_pizzeriaId_fkey" FOREIGN KEY ("pizzeriaId") REFERENCES "Pizzeria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pizzeriaId_fkey" FOREIGN KEY ("pizzeriaId") REFERENCES "Pizzeria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pizzaId_fkey" FOREIGN KEY ("pizzaId") REFERENCES "Pizza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_selectedSizeId_fkey" FOREIGN KEY ("selectedSizeId") REFERENCES "PizzaSizeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemTopping" ADD CONSTRAINT "OrderItemTopping_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemTopping" ADD CONSTRAINT "OrderItemTopping_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "PizzaToppingOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PizzaToPizzaToppingOption" ADD CONSTRAINT "_PizzaToPizzaToppingOption_A_fkey" FOREIGN KEY ("A") REFERENCES "Pizza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PizzaToPizzaToppingOption" ADD CONSTRAINT "_PizzaToPizzaToppingOption_B_fkey" FOREIGN KEY ("B") REFERENCES "PizzaToppingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
