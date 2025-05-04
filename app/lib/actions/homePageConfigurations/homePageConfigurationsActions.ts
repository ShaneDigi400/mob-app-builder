import prisma from "../../../db.server";

export async function getHomePageConfiguration(shopName: string) {
  return prisma.homePageConfiguration.findUnique({
    where: {
      shopName,
    },
  });
}

export async function saveHomePageConfiguration(
  shopName: string,
  data: {
    heroBanners: string;
    topCollections: string;
    primaryProductList: string;
    primaryProductListSortKey: string;
    primaryProductListSortKeyReverse: boolean;
    secondaryProductList: string;
    secondaryProductListSortKey: string;
    secondaryProductListSortKeyReverse: boolean;
  }
) {
  const existingConfig = await prisma.homePageConfiguration.findUnique({
    where: {
      shopName,
    },
  });

  if (existingConfig) {
    return prisma.homePageConfiguration.update({
      where: { id: existingConfig.id },
      data: {
        ...data,
        shopName,
      },
    });
  }

  return prisma.homePageConfiguration.create({
    data: {
      ...data,
      shopName,
    },
  });
}
