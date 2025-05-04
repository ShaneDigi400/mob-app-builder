import { useState, useEffect, useCallback, useMemo } from "react";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
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
  InlineStack,
  LegacyStack,
  Tag,
  Listbox,
  EmptySearchResult,
  Combobox,
  AutoSelection,
  Icon,
  Thumbnail
} from "@shopify/polaris";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { SearchIcon } from "@shopify/polaris-icons";
import { getHomePageConfiguration, saveHomePageConfiguration } from "../lib/actions/homePageConfigurations/homePageConfigurationsActions";
import { getExistingSetup } from "../lib/actions/setUp/setUpActions";
import { getExistingTheme } from "../lib/actions/themeConfigurations/themeConfigurationsActions";
import { useRedirectWithToast } from "../lib/utils/redirectWithToast";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  // Check if setup is completed
  const existingSetup = await getExistingSetup(session.shop);
  if (!existingSetup) {
    return json({ 
      error: "Please complete the setup first", 
      redirectTo: "/app/setUp" 
    } as const, { status: 403 });
  }

  // Check if theme configuration is completed
  const existingTheme = await getExistingTheme(session.shop);
  if (!existingTheme) {
    return json({ 
      error: "Please complete the theme configuration first", 
      redirectTo: "/app/themeConfigurations" 
    } as const, { status: 403 });
  }
  
  // Get existing home page configuration for the shop
  const existingConfig = await getHomePageConfiguration(session.shop);

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
  
  return json({ existingConfig, collections } as const);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  try {
    // Handle file uploads
    const heroBannerFiles = formData.getAll("heroBannerFiles") as File[];
    const existingHeroBanners = JSON.parse(formData.get("existingHeroBanners") as string || "[]");
    console.log("Received files:", heroBannerFiles);
    console.log("Existing banners:", existingHeroBanners);
    const heroBannerUrls: string[] = [...existingHeroBanners];

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

    const data = {
      heroBanners: JSON.stringify(heroBannerUrls),
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
    
    await saveHomePageConfiguration(session.shop, data);
    
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
  const loaderData = useLoaderData<typeof loader>();
  const redirectWithToast = useRedirectWithToast();
  const actionData = useActionData<{ success: boolean; error?: string; message?: string }>();
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
    primaryProductListSortKey: 'RELEVANCE',
    primaryProductListSortKeyReverse: false,
    secondaryProductList: '',
    secondaryProductListSortKey: 'RELEVANCE',
    secondaryProductListSortKeyReverse: false,
  });
  const [heroBannerFiles, setHeroBannerFiles] = useState<File[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [primaryCollectionInput, setPrimaryCollectionInput] = useState('');
  const [secondaryCollectionInput, setSecondaryCollectionInput] = useState('');

  // Redirect if setup or theme configuration is not completed
  useEffect(() => {
    if ('error' in loaderData && 'redirectTo' in loaderData) {
      redirectWithToast(loaderData);
    }
  }, [loaderData, redirectWithToast]);

  const { existingConfig, collections } = 'existingConfig' in loaderData ? loaderData : { existingConfig: null, collections: [] };

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
      
      // Set initial values for Combobox inputs
      const primaryCollection = collections.find((c: { label: string; value: string }) => c.value === existingConfig.primaryProductList);
      const secondaryCollection = collections.find((c: { label: string; value: string }) => c.value === existingConfig.secondaryProductList);
      setPrimaryCollectionInput(primaryCollection?.label || '');
      setSecondaryCollectionInput(secondaryCollection?.label || '');
    }
  }, [existingConfig, collections]);

  const handleSubmit = useCallback(() => {
    const formDataToSubmit = new FormData();
    
    // Calculate total images (existing + new)
    const totalImages = formData.heroBanners.length + heroBannerFiles.length;
    
    if (totalImages > 4) {
      setError("You can only have up to 4 hero banner images total");
      return;
    }
    
    // Add hero banner files
    heroBannerFiles.forEach((file) => {
      if (file instanceof File) {
        console.log("Adding file to form data:", file);
        formDataToSubmit.append("heroBannerFiles", file, file.name);
      }
    });
    
    // Add existing hero banner URLs
    formDataToSubmit.append("existingHeroBanners", JSON.stringify(formData.heroBanners));
    
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

    // Clear the files to upload after submission
    setHeroBannerFiles([]);
  }, [formData, submit, heroBannerFiles, selectedCollections]);

  // Show toast notifications based on action result
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        shopify.toast.show(actionData.message || "Operation completed successfully");
      } else {
        shopify.toast.show(actionData.error || "Failed to save home page configuration");
      }
    }
  }, [actionData]);

  const handleChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDiscardChanges = useCallback(() => {
    // Check if there are any changes to discard
    const hasChanges = existingConfig ? (
      JSON.stringify(formData.heroBanners) !== existingConfig.heroBanners ||
      formData.topCollections !== existingConfig.topCollections ||
      formData.primaryProductList !== existingConfig.primaryProductList ||
      formData.primaryProductListSortKey !== existingConfig.primaryProductListSortKey ||
      formData.primaryProductListSortKeyReverse !== existingConfig.primaryProductListSortKeyReverse ||
      formData.secondaryProductList !== existingConfig.secondaryProductList ||
      formData.secondaryProductListSortKey !== existingConfig.secondaryProductListSortKey ||
      formData.secondaryProductListSortKeyReverse !== existingConfig.secondaryProductListSortKeyReverse ||
      heroBannerFiles.length > 0
    ) : (
      formData.heroBanners.length > 0 ||
      formData.topCollections !== '' ||
      formData.primaryProductList !== '' ||
      formData.primaryProductListSortKey !== 'RELEVANCE' ||
      formData.primaryProductListSortKeyReverse !== false ||
      formData.secondaryProductList !== '' ||
      formData.secondaryProductListSortKey !== 'RELEVANCE' ||
      formData.secondaryProductListSortKeyReverse !== false ||
      heroBannerFiles.length > 0
    );

    if (!hasChanges) {
      shopify.toast.show("No changes to discard.");
      return;
    }

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
      
      // Reset Combobox values
      const primaryCollection = collections.find((c: { label: string; value: string }) => c.value === existingConfig.primaryProductList);
      const secondaryCollection = collections.find((c: { label: string; value: string }) => c.value === existingConfig.secondaryProductList);
      setPrimaryCollectionInput(primaryCollection?.label || '');
      setSecondaryCollectionInput(secondaryCollection?.label || '');
    } else {
      setFormData({
        heroBanners: [],
        topCollections: '',
        primaryProductList: '',
        primaryProductListSortKey: 'RELEVANCE',
        primaryProductListSortKeyReverse: false,
        secondaryProductList: '',
        secondaryProductListSortKey: 'RELEVANCE',
        secondaryProductListSortKeyReverse: false,
      });
      setSelectedCollections([]);
      setPrimaryCollectionInput('');
      setSecondaryCollectionInput('');
    }
    setError(null);
    shopify.toast.show("Changes discarded. Form restored to last saved state.");
  }, [existingConfig, collections, formData, heroBannerFiles]);

  const handleActiveOptionChange = useCallback(
    (activeOption: string) => {
      const activeOptionIsAction = activeOption === searchValue;
      if (!activeOptionIsAction && !selectedCollections.includes(activeOption)) {
        setSuggestion(activeOption);
      } else {
        setSuggestion('');
      }
    },
    [searchValue, selectedCollections],
  );

  const updateSelection = useCallback(
    (selected: string) => {
      const nextSelectedCollections = new Set([...selectedCollections]);
      if (nextSelectedCollections.has(selected)) {
        nextSelectedCollections.delete(selected);
      } else {
        if (nextSelectedCollections.size >= 10) {
          setError("You can only select up to 10 collections");
          return;
        }
        nextSelectedCollections.add(selected);
      }
      setSelectedCollections([...nextSelectedCollections]);
      setSearchValue('');
      setSuggestion('');
      setError(null);
    },
    [selectedCollections],
  );

  const removeTag = useCallback(
    (tag: string) => () => {
      updateSelection(tag);
    },
    [updateSelection],
  );

  const formatOptionText = useCallback(
    (option: string) => {
      const trimValue = searchValue.trim().toLocaleLowerCase();
      const matchIndex = option.toLocaleLowerCase().indexOf(trimValue);

      if (!searchValue || matchIndex === -1) return option;

      const start = option.slice(0, matchIndex);
      const highlight = option.slice(matchIndex, matchIndex + trimValue.length);
      const end = option.slice(matchIndex + trimValue.length, option.length);

      return (
        <p>
          {start}
          <Text fontWeight="bold" as="span">
            {highlight}
          </Text>
          {end}
        </p>
      );
    },
    [searchValue],
  );

  const escapeSpecialRegExCharacters = useCallback(
    (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    [],
  );

  const options = useMemo(() => {
    let list;
    const filterRegex = new RegExp(escapeSpecialRegExCharacters(searchValue), 'i');

    if (searchValue) {
      list = collections.filter((collection: { label: string; value: string }) => collection.label.match(filterRegex));
    } else {
      list = collections;
    }

    return [...list];
  }, [searchValue, collections, escapeSpecialRegExCharacters]);

  const verticalContentMarkup =
    selectedCollections.length > 0 ? (
      <LegacyStack spacing="extraTight" alignment="center">
        {selectedCollections.map((collection: string) => {
          const collectionLabel = collections.find((c: { value: string; label: string }) => c.value === collection)?.label || collection;
          return (
            <Tag key={`option-${collection}`} onRemove={removeTag(collection)}>
              {collectionLabel}
            </Tag>
          );
        })}
      </LegacyStack>
    ) : null;

  const optionMarkup =
    options.length > 0
      ? options.map((option) => {
          return (
            <Listbox.Option
              key={option.value}
              value={option.value}
              selected={selectedCollections.includes(option.value)}
              accessibilityLabel={option.label}
            >
              <Listbox.TextOption selected={selectedCollections.includes(option.value)}>
                {formatOptionText(option.label)}
              </Listbox.TextOption>
            </Listbox.Option>
          );
        })
      : null;

  const emptyStateMarkup = optionMarkup ? null : (
    <EmptySearchResult
      title=""
      description={`No collections found matching "${searchValue}"`}
    />
  );

  const listboxMarkup =
    optionMarkup || emptyStateMarkup ? (
      <Listbox
        autoSelection={AutoSelection.None}
        onSelect={updateSelection}
        onActiveOptionChange={handleActiveOptionChange}
      >
        {optionMarkup}
        {emptyStateMarkup}
      </Listbox>
    ) : null;

  const sortKeyOptions = [
    { label: "Best Selling", value: "BEST_SELLING" },
    { label: "Price", value: "PRICE" },
    { label: "Relevance", value: "RELEVANCE" },
    { label: "Title", value: "TITLE" },
  ];

  const updatePrimaryCollectionText = useCallback(
    (value: string) => {
      setPrimaryCollectionInput(value);
      if (!value) {
        setFormData(prev => ({ ...prev, primaryProductList: '' }));
      }
    },
    [],
  );

  const updateSecondaryCollectionText = useCallback(
    (value: string) => {
      setSecondaryCollectionInput(value);
      if (!value) {
        setFormData(prev => ({ ...prev, secondaryProductList: '' }));
      }
    },
    [],
  );

  const updatePrimaryCollectionSelection = useCallback(
    (selected: string) => {
      const matchedOption = collections.find((option: { label: string; value: string }) => {
        return option.value === selected;
      });

      setFormData(prev => ({ ...prev, primaryProductList: selected }));
      setPrimaryCollectionInput((matchedOption && matchedOption.label) || '');
    },
    [collections],
  );

  const updateSecondaryCollectionSelection = useCallback(
    (selected: string) => {
      const matchedOption = collections.find((option: { label: string; value: string }) => {
        return option.value === selected;
      });

      setFormData(prev => ({ ...prev, secondaryProductList: selected }));
      setSecondaryCollectionInput((matchedOption && matchedOption.label) || '');
    },
    [collections],
  );

  const primaryOptionsMarkup = collections.map((option: { label: string; value: string }) => {
    const { label, value } = option;
    return (
      <Listbox.Option
        key={`${value}`}
        value={value}
        selected={formData.primaryProductList === value}
        accessibilityLabel={label}
      >
        {label}
      </Listbox.Option>
    );
  });

  const secondaryOptionsMarkup = collections.map((option: { label: string; value: string }) => {
    const { label, value } = option;
    return (
      <Listbox.Option
        key={`${value}`}
        value={value}
        selected={formData.secondaryProductList === value}
        accessibilityLabel={label}
      >
        {label}
      </Listbox.Option>
    );
  });

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
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ 
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Hero Banners
                        </label>
                        {formData.heroBanners.length > 0 && (
                          <div style={{ 
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            marginBottom: '1rem'
                          }}>
                            {formData.heroBanners.map((banner: string, index: number) => (
                              <div 
                                key={index} 
                                style={{ 
                                  position: 'relative',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                              >
                                <Thumbnail
                                  source={banner}
                                  size="large"
                                  alt={`Hero banner ${index + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newBanners = [...formData.heroBanners];
                                    newBanners.splice(index, 1);
                                    setFormData(prev => ({ ...prev, heroBanners: newBanners }));
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '0.25rem',
                                    right: '0.25rem',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '1.5rem',
                                    height: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: hoveredIndex === index ? '1' : '0',
                                    transition: 'opacity 0.2s',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
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
                          <div style={{ marginTop: '1rem' }}>
                            <h4 style={{
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '0.5rem'
                            }}>
                              Files to upload:
                            </h4>
                            <ul style={{
                              fontSize: '0.875rem',
                              color: '#4b5563'
                            }}>
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
                      
                        <Combobox
                          allowMultiple
                          activator={
                            <Combobox.TextField
                              autoComplete="off"
                              label="Search collections"
                              labelHidden
                              value={searchValue}
                              suggestion={suggestion}
                              placeholder="Search collections"
                              verticalContent={verticalContentMarkup}
                              onChange={setSearchValue}
                            />
                          }
                        >
                          {listboxMarkup}
                        </Combobox>
       
                    </FormLayout.Group>
                  </BlockStack>
                </Box>

                <Box paddingBlock="400">
                  <BlockStack gap="400">
                    <Box>
                      <Text variant="headingMd" as="h2">Expanded Collection 1</Text>
                    </Box>
                    <FormLayout.Group>
       
                        <Combobox
                          activator={
                            <Combobox.TextField
                              prefix={<Icon source={SearchIcon} />}
                              onChange={updatePrimaryCollectionText}
                              label="Collection"
                              value={primaryCollectionInput}
                              placeholder="Search collections"
                              autoComplete="off"
                            />
                          }
                        >
                          <Listbox onSelect={updatePrimaryCollectionSelection}>
                            {primaryOptionsMarkup}
                          </Listbox>
                        </Combobox>

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

                        <Combobox
                          activator={
                            <Combobox.TextField
                              prefix={<Icon source={SearchIcon} />}
                              onChange={updateSecondaryCollectionText}
                              label="Collection"
                              value={secondaryCollectionInput}
                              placeholder="Search collections"
                              autoComplete="off"
                            />
                          }
                        >
                          <Listbox onSelect={updateSecondaryCollectionSelection}>
                            {secondaryOptionsMarkup}
                          </Listbox>
                        </Combobox>
 
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
                  <Button variant="primary" submit>
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
