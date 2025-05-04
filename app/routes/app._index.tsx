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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getExistingSetup } from "../lib/actions/setUp/setUpActions";
import { getExistingTheme } from "../lib/actions/themeConfigurations/themeConfigurationsActions";
import { getHomePageConfiguration } from "../lib/actions/homePageConfigurations/homePageConfigurationsActions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Get existing configurations
  const setup = await getExistingSetup(session.shop);
  const theme = await getExistingTheme(session.shop);
  const homePageConfig = await getHomePageConfiguration(session.shop);
  
  return { setup, theme, homePageConfig };
};

export default function Index() {
  const { setup, theme, homePageConfig } = useLoaderData<typeof loader>();
  
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
            <Button url="/app/setUp">
              Go to Setup
            </Button>
          </InlineStack>
        </Banner>
      );
    }
    
    if (!isThemeConfigured) {
      return (
        <Banner tone="warning">
          <p>Please configure your theme settings.</p>
          <InlineStack gap="200">
            <Button url="/app/themeConfigurations">
              Configure Theme
            </Button>
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
        <p>All configurations are complete! Your mobile app is ready to be built.</p>
      </Banner>
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
                      <Button
                        url="/app/setUp"
                        variant="plain"
                      >
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
                      <Button
                        url="/app/themeConfigurations"
                        variant="plain"
                      >
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
                      <Button
                        url="/app/homePageConfigurations"
                        variant="plain"
                      >
                        {isHomePageConfigured ? "View Home Page" : "Configure Home Page"}
                      </Button>
                    </BlockStack>
                  </Card>
                </InlineStack>
              </BlockStack>
            </Card>
            
            {isHomePageConfigured && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Preview
                  </Text>
                  <Box paddingBlock="400">
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingSm">
                        Hero Banners
                      </Text>
                      <InlineStack gap="400" wrap>
                        {JSON.parse(homePageConfig.heroBanners).map((banner: string, index: number) => (
                          <Thumbnail
                            key={index}
                            source={banner}
                            size="large"
                            alt={`Hero banner ${index + 1}`}
                          />
                        ))}
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
