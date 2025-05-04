import prisma from "../../../db.server";
import { json } from "@remix-run/node";

export async function getExistingSetup(shopName: string) {
  return await prisma.customerSetup.findUnique({
    where: {
      shopName,
    },
  });
}

export async function saveOrUpdateSetup(shopName: string, data: {
  companyName: string;
  customerEmail: string;
  customerPhoneNumberCountryCode: string;
  customerPhoneNumber: string;
  appName: string;
}) {
  try {
    // Check if setup already exists for this shop
    const existingSetup = await prisma.customerSetup.findUnique({
      where: {
        shopName,
      },
    });
    
    if (existingSetup) {
      // Update existing setup
      await prisma.customerSetup.update({
        where: {
          shopName,
        },
        data,
      });
      return json({ success: true, message: "Setup updated successfully!" });
    } else {
      // Create new setup
      await prisma.customerSetup.create({
        data: {
          ...data,
          shopName,
        },
      });
      return json({ success: true, message: "Setup saved successfully!" });
    }
  } catch (error) {
    console.error("Error saving setup data:", error);
    return json({ success: false, message: "Failed to save setup data" });
  }
} 