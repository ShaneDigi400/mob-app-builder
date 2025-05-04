import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { isValidApiKey } from "../config/api-keys";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Check for API key in headers
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || !isValidApiKey(apiKey)) {
      return json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    // Get shopName from query parameters
    const url = new URL(request.url);
    const shopName = url.searchParams.get('shopName');

    if (!shopName) {
      return json({ error: "shopName parameter is required" }, { status: 400 });
    }

    // Fetch CustomerSetup and ThemeConfiguration data
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

    return json({
      customerSetup: {
        id: customerSetup.id,
        shopName: customerSetup.shopName,
        companyName: customerSetup.companyName,
        customerEmail: customerSetup.customerEmail,
        customerPhoneNumberCountryCode: customerSetup.customerPhoneNumberCountryCode,
        customerPhoneNumber: customerSetup.customerPhoneNumber,
        appName: customerSetup.appName
      },
      themeConfigurations: customerSetup.themeConfigurations[0],
      homePageConfiguration: {
        heroBanners: JSON.parse(customerSetup.homePageConfiguration?.heroBanners || '[]'),
        topCollections: JSON.parse(customerSetup.homePageConfiguration?.topCollections || '[]'),
        primaryProductList: {
          list: customerSetup.homePageConfiguration?.primaryProductList || [],
          sortKey: customerSetup.homePageConfiguration?.primaryProductListSortKey,
          reverse: customerSetup.homePageConfiguration?.primaryProductListSortKeyReverse
        },
        secondaryProductList: {
          list: customerSetup.homePageConfiguration?.secondaryProductList || [],
          sortKey: customerSetup.homePageConfiguration?.secondaryProductListSortKey,
          reverse: customerSetup.homePageConfiguration?.secondaryProductListSortKeyReverse
        }
      }
    });
  } catch (error) {
    console.error("Configuration API Error:", error);
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

export const action = async ({ request }: ActionFunctionArgs) => {
  // Handle POST requests if needed in the future
  return json({ error: "Method not allowed" }, { status: 405 });
};
