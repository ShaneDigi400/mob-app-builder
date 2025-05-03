/*
  Warnings:

  - A unique constraint covering the columns `[shop]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "CustomerSetup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhoneNumberCountryCode" TEXT NOT NULL,
    "customerPhoneNumber" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerSetup_shopName_fkey" FOREIGN KEY ("shopName") REFERENCES "Session" ("shop") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSetup_shopName_key" ON "CustomerSetup"("shopName");

-- CreateIndex
CREATE UNIQUE INDEX "Session_shop_key" ON "Session"("shop");
