import prisma from "../../../db.server";
import { json } from "@remix-run/node";

export async function getExistingTheme(shopName: string) {
  return await prisma.themeConfiguration.findUnique({
    where: {
      shopName,
    },
  });
}

export async function saveOrUpdateTheme(shopName: string, data: {
  themeCode: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  buttonColor: string;
  appBarBackgroundColor: string;
  buttonRadius: string;
  edgePadding: string;
  splashScreenWidth: string;
}) {
  try {
    // Check if theme configuration exists
    const existingTheme = await prisma.themeConfiguration.findUnique({
      where: {
        shopName,
      },
    });

    if (existingTheme) {
      // Update existing theme
      await prisma.themeConfiguration.update({
        where: { id: existingTheme.id },
        data,
      });
      return json({ success: true, message: "Theme configuration updated successfully!" });
    } else {
      // Create new theme
      await prisma.themeConfiguration.create({
        data: {
          ...data,
          shopName,
        },
      });
      return json({ success: true, message: "Theme configuration saved successfully!" });
    }
  } catch (error) {
    console.error("Error saving theme configuration:", error);
    return json({ success: false, message: "Failed to save theme configuration" });
  }
}
