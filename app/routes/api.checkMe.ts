import { LoaderFunctionArgs } from "@remix-run/node";
//import prisma from "app/db.server";
import { unauthenticated } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const shopDomain = 'mobile-app-connector.myshopify.com';
    const results = await getStorefront(shopDomain);
    console.log('>>>>>>results', results);
    const graphql = results.storefront.graphql;
    const query = `query {
  collections(first: 250) {
  pageInfo{
    hasNextPage
  }
    edges {
      cursor
      node {
        title
        description
        descriptionHtml
        handle
        id
        updatedAt
        image {
          altText
          id
          originalSrc
        }
        metafields(identifiers: []) {

          id
          type
          key
          namespace
          value
          description
          reference {
            ... on MediaImage {
              image {
                originalSrc
                url
                id
              }
            }
          }
          
        }
      }
    }
  }
}`;
    const response = await graphql(query);
    const data = await response.json();
    console.log('>>>>>>data', data);
    return data;
}


async function getStorefront(shopDomain: string) {
    const storefrontResult = await unauthenticated.storefront(
        shopDomain
      )
      return storefrontResult;
}

// async function getAccessToken(shopDomain: string) {
//     const session = await prisma.session.findUnique({
//         where: {
//             shop: shopDomain,
//         },
//     });
//     return session?.accessToken;
// }