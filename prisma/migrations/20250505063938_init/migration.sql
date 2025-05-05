-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSetup" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhoneNumberCountryCode" TEXT NOT NULL,
    "customerPhoneNumber" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeConfiguration" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "themeCode" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "buttonColor" TEXT NOT NULL,
    "appBarBackgroundColor" TEXT NOT NULL,
    "buttonRadius" TEXT NOT NULL,
    "edgePadding" TEXT NOT NULL,
    "splashScreenWidth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomePageConfiguration" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "heroBanners" TEXT NOT NULL,
    "topCollections" TEXT NOT NULL,
    "primaryProductList" TEXT NOT NULL,
    "primaryProductListSortKey" TEXT NOT NULL,
    "primaryProductListSortKeyReverse" BOOLEAN NOT NULL DEFAULT false,
    "secondaryProductList" TEXT NOT NULL,
    "secondaryProductListSortKey" TEXT NOT NULL,
    "secondaryProductListSortKeyReverse" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePageConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_shop_key" ON "Session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSetup_shopName_key" ON "CustomerSetup"("shopName");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeConfiguration_shopName_key" ON "ThemeConfiguration"("shopName");

-- CreateIndex
CREATE UNIQUE INDEX "HomePageConfiguration_shopName_key" ON "HomePageConfiguration"("shopName");

-- AddForeignKey
ALTER TABLE "CustomerSetup" ADD CONSTRAINT "CustomerSetup_shopName_fkey" FOREIGN KEY ("shopName") REFERENCES "Session"("shop") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeConfiguration" ADD CONSTRAINT "ThemeConfiguration_shopName_fkey" FOREIGN KEY ("shopName") REFERENCES "CustomerSetup"("shopName") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePageConfiguration" ADD CONSTRAINT "HomePageConfiguration_shopName_fkey" FOREIGN KEY ("shopName") REFERENCES "CustomerSetup"("shopName") ON DELETE RESTRICT ON UPDATE CASCADE;
