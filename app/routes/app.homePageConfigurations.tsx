import { useState, useEffect, useCallback } from "react";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Form,
  FormLayout,
  Button,
  Box,
  BlockStack,
  Banner,
  Select,
  ChoiceList,
  Text,
  DropZone,
  InlineStack
} from "@shopify/polaris";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";
import { json } from "@remix-run/node";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  // Get existing home page configuration for the shop
  const existingConfig = await prisma.homePageConfiguration.findFirst({
    where: {
      shopName: session.shop,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

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
    `
  );

  const collectionsData = await collectionsResponse.json();
  const collections = collectionsData.data.collections.edges.map((edge: any) => ({
    label: edge.node.title,
    value: edge.node.id,
  }));
  
  return json({ existingConfig, collections });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  try {
    // Handle file uploads
    const heroBannerFiles = formData.getAll("heroBannerFiles") as File[];
    console.log("Received files:", heroBannerFiles);
    const heroBannerUrls: string[] = [];

    for (const file of heroBannerFiles) {
      try {
        // Validate file data
        if (!file || !(file instanceof File) || !file.name || !file.type) {
          console.error("Invalid file data:", file);
          continue;
        }

        console.log("Processing file:", file.name, file.type, file.size);

        // Create staged upload
        const uploadResponse = await admin.graphql(
          `#graphql
            mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
              stagedUploadsCreate(input: $input) {
                stagedTargets {
                  url
                  resourceUrl
                  parameters {
                    name
                    value
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          {
            variables: {
              input: [{
                filename: file.name,
                mimeType: file.type,
                resource: "FILE",
                httpMethod: "POST"
              }]
            }
          }
        );

        const uploadData = await uploadResponse.json();
        console.log("Staged upload response:", uploadData);
        
        if (uploadData.data.stagedUploadsCreate.userErrors?.length > 0) {
          throw new Error(uploadData.data.stagedUploadsCreate.userErrors[0].message);
        }

        const stagedTarget = uploadData.data.stagedUploadsCreate.stagedTargets[0];
        console.log("Staged target:", stagedTarget);

        // Upload the file to the staged URL
        const uploadFormData = new FormData();
        stagedTarget.parameters.forEach((param: { name: string; value: string }) => {
          uploadFormData.append(param.name, param.value);
        });
        uploadFormData.append('file', file);

        console.log("Uploading to staged URL:", stagedTarget.url);
        const uploadResult = await fetch(stagedTarget.url, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResult.ok) {
          console.error("Upload failed:", await uploadResult.text());
          throw new Error('Failed to upload file to staged URL');
        }

        console.log("File uploaded successfully to staged URL");
        heroBannerUrls.push(stagedTarget.resourceUrl);
      } catch (error) {
        console.error("Error uploading file:", error);
        continue;
      }
    }

    console.log("Final hero banner URLs:", heroBannerUrls);

    // If no valid files were uploaded, use existing hero banners
    const existingConfig = await prisma.homePageConfiguration.findFirst({
      where: {
        shopName: session.shop,
      },
    });

    const data = {
      shopName: session.shop,
      heroBanners: heroBannerUrls.length > 0 ? JSON.stringify(heroBannerUrls) : existingConfig?.heroBanners || "[]",
      topCollections: formData.get("topCollections") as string,
      primaryProductList: formData.get("primaryProductList") as string,
      primaryProductListSortKey: formData.get("primaryProductListSortKey") as string,
      primaryProductListSortKeyReverse: formData.get("primaryProductListSortKeyReverse") === "true",
      secondaryProductList: formData.get("secondaryProductList") as string,
      secondaryProductListSortKey: formData.get("secondaryProductListSortKey") as string,
      secondaryProductListSortKeyReverse: formData.get("secondaryProductListSortKeyReverse") === "true",
    };

    // Validate required fields
    if (!data.topCollections || !data.primaryProductList || 
        !data.primaryProductListSortKey || !data.secondaryProductList || 
        !data.secondaryProductListSortKey) {
      return json({ success: false, error: "All fields are required" });
    }
    
    if (existingConfig) {
      // Update existing configuration
      await prisma.homePageConfiguration.update({
        where: { id: existingConfig.id },
        data,
      });
    } else {
      // Create new configuration
      await prisma.homePageConfiguration.create({
        data,
      });
    }
    
    return json({ success: true, message: "Home page configuration saved successfully!" });
  } catch (error) {
    console.error("Error saving home page configuration:", error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save home page configuration" 
    });
  }
};

export default function HomePageConfigurationsPage() {
  const { existingConfig, collections } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    heroBanners: string[];
    topCollections: string;
    primaryProductList: string;
    primaryProductListSortKey: string;
    primaryProductListSortKeyReverse: boolean;
    secondaryProductList: string;
    secondaryProductListSortKey: string;
    secondaryProductListSortKeyReverse: boolean;
  }>({
    heroBanners: [],
    topCollections: '',
    primaryProductList: '',
    primaryProductListSortKey: '',
    primaryProductListSortKeyReverse: false,
    secondaryProductList: '',
    secondaryProductListSortKey: '',
    secondaryProductListSortKeyReverse: false,
  });
  const [heroBannerFiles, setHeroBannerFiles] = useState<File[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  const handleHeroBannerDrop = useCallback((_dropFiles: File[], acceptedFiles: File[]) => {
    console.log("Files dropped:", acceptedFiles);
    if (heroBannerFiles.length + acceptedFiles.length > 4) {
      setError("You can only upload up to 4 hero banner images");
      return;
    }
    setHeroBannerFiles([...heroBannerFiles, ...acceptedFiles]);
  }, [heroBannerFiles]);

  // Load existing configuration if it exists
  useEffect(() => {
    if (existingConfig) {
      setFormData({
        heroBanners: JSON.parse(existingConfig.heroBanners),
        topCollections: existingConfig.topCollections,
        primaryProductList: existingConfig.primaryProductList,
        primaryProductListSortKey: existingConfig.primaryProductListSortKey,
        primaryProductListSortKeyReverse: existingConfig.primaryProductListSortKeyReverse,
        secondaryProductList: existingConfig.secondaryProductList,
        secondaryProductListSortKey: existingConfig.secondaryProductListSortKey,
        secondaryProductListSortKeyReverse: existingConfig.secondaryProductListSortKeyReverse,
      });
      setSelectedCollections(JSON.parse(existingConfig.topCollections));
    }
  }, [existingConfig]);

  const handleSubmit = useCallback(() => {
    const formDataToSubmit = new FormData();
    
    // Add hero banner files
    heroBannerFiles.forEach((file) => {
      if (file instanceof File) {
        console.log("Adding file to form data:", file);
        formDataToSubmit.append("heroBannerFiles", file, file.name);
      }
    });
    
    // Add other form data
    formDataToSubmit.append("topCollections", JSON.stringify(selectedCollections));
    formDataToSubmit.append("primaryProductList", formData.primaryProductList);
    formDataToSubmit.append("primaryProductListSortKey", formData.primaryProductListSortKey);
    formDataToSubmit.append("primaryProductListSortKeyReverse", formData.primaryProductListSortKeyReverse.toString());
    formDataToSubmit.append("secondaryProductList", formData.secondaryProductList);
    formDataToSubmit.append("secondaryProductListSortKey", formData.secondaryProductListSortKey);
    formDataToSubmit.append("secondaryProductListSortKeyReverse", formData.secondaryProductListSortKeyReverse.toString());

    console.log("Submitting form data with files:", heroBannerFiles);
    submit(formDataToSubmit, { 
      method: "post",
      encType: "multipart/form-data"
    });
  }, [formData, submit, heroBannerFiles, selectedCollections]);

  // Handle action response
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'action') {
        const { success, error, message } = event.data;
        if (success) {
          setSuccess(message);
          setError(null);
        } else {
          setError(error);
          setSuccess(null);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle form submission response
  useEffect(() => {
    const handleSubmitResponse = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const response = form.dataset.response;
      if (response) {
        const data = JSON.parse(response);
        if (data.success) {
          setSuccess(data.message);
          setError(null);
        } else {
          setError(data.error);
          setSuccess(null);
        }
      }
    };

    document.addEventListener('submit', handleSubmitResponse);
    return () => document.removeEventListener('submit', handleSubmitResponse);
  }, []);

  const handleChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDiscardChanges = useCallback(() => {
    if (existingConfig) {
      setFormData({
        heroBanners: JSON.parse(existingConfig.heroBanners),
        topCollections: existingConfig.topCollections,
        primaryProductList: existingConfig.primaryProductList,
        primaryProductListSortKey: existingConfig.primaryProductListSortKey,
        primaryProductListSortKeyReverse: existingConfig.primaryProductListSortKeyReverse,
        secondaryProductList: existingConfig.secondaryProductList,
        secondaryProductListSortKey: existingConfig.secondaryProductListSortKey,
        secondaryProductListSortKeyReverse: existingConfig.secondaryProductListSortKeyReverse,
      });
      setSelectedCollections(JSON.parse(existingConfig.topCollections));
    } else {
      setFormData({
        heroBanners: [],
        topCollections: '',
        primaryProductList: '',
        primaryProductListSortKey: '',
        primaryProductListSortKeyReverse: false,
        secondaryProductList: '',
        secondaryProductListSortKey: '',
        secondaryProductListSortKeyReverse: false,
      });
      setSelectedCollections([]);
    }
    setError(null);
  }, [existingConfig]);

  const handleCollectionSelect = useCallback((value: string[]) => {
    if (value.length > 10) {
      setError("You can only select up to 10 collections");
      return;
    }
    setSelectedCollections(value);
  }, []);

  const sortKeyOptions = [
    { label: "Best Selling", value: "BEST_SELLING" },
    { label: "Price", value: "PRICE" },
    { label: "Relevance", value: "RELEVANCE" },
    { label: "Title", value: "TITLE" },
  ];

  return (
    <Page>
      <TitleBar title="Home Page Configurations" />
      <Layout>
        <Layout.Section>
          <Card>
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                {error && (
                  <Banner tone="critical">
                    <p>{error}</p>
                  </Banner>
                )}
                {success && (
                  <Banner tone="success" onDismiss={() => setSuccess(null)}>
                    <p>{success}</p>
                  </Banner>
                )}
                
                <Box paddingBlock="400">
                  <BlockStack gap="400">
                    <Box>
                      <Text variant="headingMd" as="h2">Hero Banners</Text>
                      <Text as="p" variant="bodyMd">Upload up to 4 hero banner images</Text>
                    </Box>
                    <FormLayout.Group>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hero Banners
                        </label>
                        {formData.heroBanners.length > 0 && (
                          <div className="flex flex-wrap gap-4 mb-4">
                            {formData.heroBanners.map((banner: string, index: number) => (
                              <div key={index} className="relative group">
                                <img
                                  src={banner}
                                  alt={`Hero banner ${index + 1}`}
                                  className="w-32 h-32 object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newBanners = [...formData.heroBanners];
                                    newBanners.splice(index, 1);
                                    setFormData(prev => ({ ...prev, heroBanners: newBanners }));
                                  }}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <DropZone
                          accept="image/*"
                          type="image"
                          onDrop={handleHeroBannerDrop}
                          allowMultiple
                        >
                          <DropZone.FileUpload />
                        </DropZone>
                        {heroBannerFiles.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Files to upload:</h4>
                            <ul className="text-sm text-gray-600">
                              {heroBannerFiles.map((file: File, index: number) => (
                                <li key={index}>{file.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </FormLayout.Group>
                  </BlockStack>
                </Box>

                <Box paddingBlock="400">
                  <BlockStack gap="400">
                    <Box>
                      <Text variant="headingMd" as="h2">Top Collections</Text>
                      <Text as="p" variant="bodyMd">Select up to 10 collections to display</Text>
                    </Box>
                    <FormLayout.Group>
                      <ChoiceList
                        title="Collections"
                        choices={collections}
                        selected={selectedCollections}
                        onChange={handleCollectionSelect}
                        allowMultiple
                      />
                    </FormLayout.Group>
                  </BlockStack>
                </Box>

                <Box paddingBlock="400">
                  <BlockStack gap="400">
                    <Box>
                      <Text variant="headingMd" as="h2">Expanded Collection 1</Text>
                    </Box>
                    <FormLayout.Group>
                      <Select
                        label="Collection"
                        options={collections}
                        value={formData.primaryProductList}
                        onChange={(value) => handleChange("primaryProductList", value)}
                      />
                      <Select
                        label="Sort By"
                        options={sortKeyOptions}
                        value={formData.primaryProductListSortKey}
                        onChange={(value) => handleChange("primaryProductListSortKey", value)}
                      />
                      <ChoiceList
                        title="Sort Order"
                        choices={[
                          { label: "Ascending", value: "false" },
                          { label: "Descending", value: "true" },
                        ]}
                        selected={[formData.primaryProductListSortKeyReverse.toString()]}
                        onChange={(value) => handleChange("primaryProductListSortKeyReverse", value[0] === "true")}
                      />
                    </FormLayout.Group>
                  </BlockStack>
                </Box>

                <Box paddingBlock="400">
                  <BlockStack gap="400">
                    <Box>
                      <Text variant="headingMd" as="h2">Expanded Collection 2</Text>
                    </Box>
                    <FormLayout.Group>
                      <Select
                        label="Collection"
                        options={collections}
                        value={formData.secondaryProductList}
                        onChange={(value) => handleChange("secondaryProductList", value)}
                      />
                      <Select
                        label="Sort By"
                        options={sortKeyOptions}
                        value={formData.secondaryProductListSortKey}
                        onChange={(value) => handleChange("secondaryProductListSortKey", value)}
                      />
                      <ChoiceList
                        title="Sort Order"
                        choices={[
                          { label: "Ascending", value: "false" },
                          { label: "Descending", value: "true" },
                        ]}
                        selected={[formData.secondaryProductListSortKeyReverse.toString()]}
                        onChange={(value) => handleChange("secondaryProductListSortKeyReverse", value[0] === "true")}
                      />
                    </FormLayout.Group>
                  </BlockStack>
                </Box>

                <InlineStack gap="400">
                  <Button submit>
                    {existingConfig ? "Update Configuration" : "Save Configuration"}
                  </Button>
                  <Button onClick={handleDiscardChanges}>
                    Discard Changes
                  </Button>
                </InlineStack>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
