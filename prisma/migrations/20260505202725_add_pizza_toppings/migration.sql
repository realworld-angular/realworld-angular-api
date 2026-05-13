-- CreateTable
CREATE TABLE "_PizzaToPizzaToppingOption" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PizzaToPizzaToppingOption_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PizzaToPizzaToppingOption_B_index" ON "_PizzaToPizzaToppingOption"("B");

-- AddForeignKey
ALTER TABLE "_PizzaToPizzaToppingOption" ADD CONSTRAINT "_PizzaToPizzaToppingOption_A_fkey" FOREIGN KEY ("A") REFERENCES "Pizza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PizzaToPizzaToppingOption" ADD CONSTRAINT "_PizzaToPizzaToppingOption_B_fkey" FOREIGN KEY ("B") REFERENCES "PizzaToppingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
