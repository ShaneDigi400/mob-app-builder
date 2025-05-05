-- CreateTable
CREATE TABLE "ThemeConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT NOT NULL UNIQUE,
    "themeCode" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "buttonColor" TEXT NOT NULL,
    "appBarBackgroundColor" TEXT NOT NULL,
    "buttonRadius" TEXT NOT NULL,
    "edgePadding" TEXT NOT NULL,
    "splashScreenWidth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ThemeConfiguration_shopName_fkey" FOREIGN KEY ("shopName") REFERENCES "CustomerSetup" ("shopName") ON DELETE RESTRICT ON UPDATE CASCADE
);
