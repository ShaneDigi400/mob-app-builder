-- CreateTable
CREATE TABLE "HomePageConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT NOT NULL,
    "heroBanners" TEXT NOT NULL,
    "topCollections" TEXT NOT NULL,
    "primaryProductList" TEXT NOT NULL,
    "primaryProductListSortKey" TEXT NOT NULL,
    "primaryProductListSortKeyReverse" BOOLEAN NOT NULL DEFAULT false,
    "secondaryProductList" TEXT NOT NULL,
    "secondaryProductListSortKey" TEXT NOT NULL,
    "secondaryProductListSortKeyReverse" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HomePageConfiguration_shopName_fkey" FOREIGN KEY ("shopName") REFERENCES "CustomerSetup" ("shopName") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HomePageConfiguration_shopName_key" ON "HomePageConfiguration"("shopName");
