import { ActionFunctionArgs, json } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import { isValidApiKey } from "../config/api-keys";

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

    const { query, variables } = await request.json();

    if (!query) {
      return json({ error: "No query provided" }, { status: 400 });
    }

    const sessionAndStorefront = await unauthenticated.storefront('mobile-app-connector.myshopify.com');
    
    const response = await sessionAndStorefront.storefront.graphql(query, {
      variables: variables || {},
    });
    const data = await response.json();
    return json(data);
  } catch (error) {
    console.error("GraphQL Error:", error);
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