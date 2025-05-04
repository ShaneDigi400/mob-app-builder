import { ActionFunctionArgs, json } from "@remix-run/node";
import { isValidApiKey } from "../config/api-keys";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Check for API key in headers
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || !isValidApiKey(apiKey)) {
      return json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    // Get shopName and delete options from request body
    const { shopName, deleteOptions } = await request.json();

    if (!shopName) {
      return json({ error: "shopName is required" }, { status: 400 });
    }

    // Find the customer setup
    const customerSetup = await prisma.customerSetup.findUnique({
      where: { shopName },
      include: {
        themeConfigurations: true,
        homePageConfiguration: true
      }
    });

    if (!customerSetup) {
      return json({ error: "No configuration found for the given shopName" }, { status: 404 });
    }

    // Handle deletion based on options
    if (deleteOptions?.deleteAll) {
      // Delete all configurations in the correct order
      if (customerSetup.homePageConfiguration) {
        await prisma.homePageConfiguration.delete({
          where: { id: customerSetup.homePageConfiguration.id }
        });
      }

      if (customerSetup.themeConfigurations.length > 0) {
        await prisma.themeConfiguration.deleteMany({
          where: { customerSetup: { id: customerSetup.id } }
        });
      }

      await prisma.customerSetup.delete({
        where: { id: customerSetup.id }
      });

      return json({ message: "All configurations deleted successfully" });
    }

    // Handle individual deletions
    const results = {
      homePageConfiguration: false,
      themeConfigurations: false,
      customerSetup: false
    };

    if (deleteOptions?.deleteHomePageConfiguration && customerSetup.homePageConfiguration) {
      await prisma.homePageConfiguration.delete({
        where: { id: customerSetup.homePageConfiguration.id }
      });
      results.homePageConfiguration = true;
    }

    if (deleteOptions?.deleteThemeConfigurations && customerSetup.themeConfigurations.length > 0) {
      await prisma.themeConfiguration.deleteMany({
        where: { customerSetup: { id: customerSetup.id } }
      });
      results.themeConfigurations = true;
    }

    if (deleteOptions?.deleteCustomerSetup) {
      // Only delete customer setup if no other configurations are being kept
      if (!deleteOptions.deleteHomePageConfiguration && !deleteOptions.deleteThemeConfigurations) {
        await prisma.customerSetup.delete({
          where: { id: customerSetup.id }
        });
        results.customerSetup = true;
      } else {
        return json({ 
          error: "Cannot delete customer setup while keeping other configurations",
          results
        }, { status: 400 });
      }
    }

    return json({ 
      message: "Selected configurations deleted successfully",
      results
    });

  } catch (error) {
    console.error("Delete API Error:", error);
    return json(
      { 
        error: "An error occurred while processing your request",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
};
