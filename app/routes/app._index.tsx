import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Banner,
  Thumbnail,
  Badge,
  Tag,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getExistingSetup } from "../lib/actions/setUp/setUpActions";
import { getExistingTheme } from "../lib/actions/themeConfigurations/themeConfigurationsActions";
import { getHomePageConfiguration } from "../lib/actions/homePageConfigurations/homePageConfigurationsActions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  // Get existing configurations
  const setup = await getExistingSetup(session.shop);
  const theme = await getExistingTheme(session.shop);
  const homePageConfig = await getHomePageConfiguration(session.shop);

  // Fetch collections from Shopify
  const collectionsResponse = await admin.graphql(
    `#graphql
      query {
        collections(first: 100) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `,
  );

  const collectionsData = await collectionsResponse.json();
  const collections = collectionsData.data.collections.edges.map(
    (edge: any) => ({
      label: edge.node.title,
      value: edge.node.id,
    }),
  );

  return { setup, theme, homePageConfig, collections };
};

export default function Index() {
  const { setup, theme, homePageConfig, collections } =
    useLoaderData<typeof loader>();

  // Check if all configurations are complete
  const isSetupComplete = !!setup;
  const isThemeConfigured = !!theme;
  const isHomePageConfigured = !!homePageConfig;

  const getStatusBanner = () => {
    if (!isSetupComplete) {
      return (
        <Banner tone="warning">
          <p>Please complete the setup configuration to get started.</p>
          <InlineStack gap="200">
            <Button url="/app/setUp">Go to Setup</Button>
          </InlineStack>
        </Banner>
      );
    }

    if (!isThemeConfigured) {
      return (
        <Banner tone="warning">
          <p>Please configure your theme settings.</p>
          <InlineStack gap="200">
            <Button url="/app/themeConfigurations">Configure Theme</Button>
          </InlineStack>
        </Banner>
      );
    }

    if (!isHomePageConfigured) {
      return (
        <Banner tone="warning">
          <p>Please configure your home page settings.</p>
          <InlineStack gap="200">
            <Button url="/app/homePageConfigurations">
              Configure Home Page
            </Button>
          </InlineStack>
        </Banner>
      );
    }

    return (
      <Banner tone="success">
        <p>
          All configurations are complete! Your mobile app is ready to be built.
        </p>
      </Banner>
    );
  };

  const renderSetupDetails = () => {
    if (!isSetupComplete) return null;

    return (
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd">
              Setup Configuration
            </Text>
            <Badge tone="success">Completed</Badge>
          </InlineStack>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              <strong>Company Name:</strong> {setup.companyName}
            </Text>
            <Text as="p" variant="bodyMd">
              <strong>Contact Email:</strong> {setup.customerEmail}
            </Text>
            <Text as="p" variant="bodyMd">
              <strong>Contact Phone:</strong>{" "}
              {setup.customerPhoneNumberCountryCode} {setup.customerPhoneNumber}
            </Text>
            <Text as="p" variant="bodyMd">
              <strong>App Name:</strong> {setup.appName}
            </Text>
          </BlockStack>
          <Button url="/app/setUp" variant="plain">
            View Setup
          </Button>
        </BlockStack>
      </Card>
    );
  };

  const renderThemeDetails = () => {
    if (!isThemeConfigured) return null;

    return (
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd">
              Theme Configuration
            </Text>
            <Badge tone="success">Completed</Badge>
          </InlineStack>
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              <strong>Theme:</strong> {theme.themeCode}
            </Text>
            <InlineStack gap="400">
              <Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  <strong>Primary</strong>
                </Text>
                <Box
                  padding="400"
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="200"
                  minWidth="100px"
                  minHeight="100px"
                >
                  <div
                    style={{
                      width: "66px",
                      height: "66px",
                      backgroundColor: theme.primaryColor,
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  {theme.primaryColor}
                </Text>
              </Box>
              <Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  <strong>Secondary</strong>
                </Text>
                <Box
                  padding="400"
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="200"
                  minWidth="100px"
                  minHeight="100px"
                >
                  <div
                    style={{
                      width: "66px",
                      height: "66px",
                      backgroundColor: theme.secondaryColor,
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  {theme.secondaryColor}
                </Text>
              </Box>
              <Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  <strong>Background</strong>
                </Text>
                <Box
                  padding="400"
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="200"
                  minWidth="100px"
                  minHeight="100px"
                >
                  <div
                    style={{
                      width: "66px",
                      height: "66px",
                      backgroundColor: theme.backgroundColor,
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  {theme.backgroundColor}
                </Text>
              </Box>

              <Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  <strong>Button</strong>
                </Text>
                <Box
                  padding="400"
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="200"
                  minWidth="100px"
                  minHeight="100px"
                >
                  <div
                    style={{
                      width: "66px",
                      height: "66px",
                      backgroundColor: theme.buttonColor,
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  {theme.buttonColor}
                </Text>
              </Box>
              <Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  <strong>App Bar Bg</strong>
                </Text>
                <Box
                  padding="400"
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="200"
                  minWidth="100px"
                  minHeight="100px"
                >
                  <div
                    style={{
                      width: "66px",
                      height: "66px",
                      backgroundColor: theme.appBarBackgroundColor,
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </Box>
                <Text as="p" variant="bodyMd" alignment="center">
                  {theme.appBarBackgroundColor}
                </Text>
              </Box>
            </InlineStack>
            <Box paddingBlock="200">
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>Button Radius:</strong> {theme.buttonRadius}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Edge Padding:</strong> {theme.edgePadding}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Splash Screen Width:</strong>{" "}
                  {theme.splashScreenWidth}
                </Text>
              </BlockStack>
            </Box>
          </BlockStack>
          <Button url="/app/themeConfigurations" variant="plain">
            View Theme
          </Button>
        </BlockStack>
      </Card>
    );
  };

  const renderHomePageDetails = () => {
    if (!isHomePageConfigured) return null;

    return (
      <Card>
        <BlockStack gap="200">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd">
              Home Page Configuration
            </Text>
            <Badge tone="success">Completed</Badge>
          </InlineStack>
          <Box paddingBlock="400">
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">
                Hero Banners
              </Text>
              <InlineStack gap="400" wrap>
                {JSON.parse(homePageConfig.heroBanners).map(
                  (banner: string, index: number) => (
                    <Thumbnail
                      key={index}
                      source={banner}
                      size="large"
                      alt={`Hero banner ${index + 1}`}
                    />
                  ),
                )}
              </InlineStack>
            </BlockStack>
          </Box>

          <Box paddingBlock="200">
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">
                Top Collections
              </Text>
              <InlineStack gap="200" wrap>
                {JSON.parse(homePageConfig.topCollections).map(
                  (collectionId: string, index: number) => {
                    const collection = collections.find(
                      (c: { value: string }) => c.value === collectionId,
                    );
                    return collection ? (
                      <Tag key={index}>{collection.label}</Tag>
                    ) : null;
                  },
                )}
              </InlineStack>
            </BlockStack>
          </Box>

          <Box paddingBlock="200">
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">
                Expanded Collection 1
              </Text>
              <InlineStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>Collection:</strong>{" "}
                  {collections.find(
                    (c: { value: string }) =>
                      c.value === homePageConfig.primaryProductList,
                  )?.label || "Not selected"}
                </Text>
                {" | "}
                <Text as="p" variant="bodyMd">
                  <strong>Sort By:</strong>{" "}
                  {homePageConfig.primaryProductListSortKey}
                </Text>
                {" | "}
                <Text as="p" variant="bodyMd">
                  <strong>Sort Order:</strong>{" "}
                  {homePageConfig.primaryProductListSortKeyReverse
                    ? "Descending"
                    : "Ascending"}
                </Text>
              </InlineStack>
            </BlockStack>
          </Box>

          <Box>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">
                Expanded Collection 2
              </Text>
              <InlineStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>Collection:</strong>{" "}
                  {collections.find(
                    (c: { value: string }) =>
                      c.value === homePageConfig.secondaryProductList,
                  )?.label || "Not selected"}
                </Text>
                {" | "}
                <Text as="p" variant="bodyMd">
                  <strong>Sort By:</strong>{" "}
                  {homePageConfig.secondaryProductListSortKey}
                </Text>
                {" | "}
                <Text as="p" variant="bodyMd">
                  <strong>Sort Order:</strong>{" "}
                  {homePageConfig.secondaryProductListSortKeyReverse
                    ? "Descending"
                    : "Ascending"}
                </Text>
              </InlineStack>
            </BlockStack>
          </Box>
          <Button url="/app/homePageConfigurations" variant="plain">
            View Home Page
          </Button>
        </BlockStack>
      </Card>
    );
  };

  return (
    <Page>
      <TitleBar title="Mobile App Builder Dashboard" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {getStatusBanner()}

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Configuration Status
                </Text>
                <InlineStack gap="400" wrap>
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Setup Configuration
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {isSetupComplete ? "✓ Completed" : "Pending"}
                      </Text>
                      <Button url="/app/setUp" variant="plain">
                        {isSetupComplete ? "View Setup" : "Configure Setup"}
                      </Button>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Theme Configuration
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {isThemeConfigured ? "✓ Completed" : "Pending"}
                      </Text>
                      <Button url="/app/themeConfigurations" variant="plain">
                        {isThemeConfigured ? "View Theme" : "Configure Theme"}
                      </Button>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Home Page Configuration
                      </Text>
                      <Text as="p" variant="bodyMd">
                        {isHomePageConfigured ? "✓ Completed" : "Pending"}
                      </Text>
                      <Button url="/app/homePageConfigurations" variant="plain">
                        {isHomePageConfigured
                          ? "View Home Page"
                          : "Configure Home Page"}
                      </Button>
                    </BlockStack>
                  </Card>
                </InlineStack>
              </BlockStack>
            </Card>

            {renderSetupDetails()}
            {renderThemeDetails()}
            {renderHomePageDetails()}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
