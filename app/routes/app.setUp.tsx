import {
    Page,
    Layout,
    Card,
    Form,
    FormLayout,
    TextField,
    Select,
    Button,
  } from "@shopify/polaris";
  import { useState, useCallback } from "react";
  import { TitleBar } from "@shopify/app-bridge-react";
  import { authenticate } from "../shopify.server";
  import prisma from "../db.server";
  import { useSubmit, useLoaderData } from "@remix-run/react";
  import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
  
  export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    
    // Get existing setup data for the shop
    const existingSetup = await prisma.customerSetup.findUnique({
      where: {
        shopName: session.shop,
      },
    });
    
    return { existingSetup };
  };
  
  export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    
    try {
      const data = {
        shopName: session.shop,
        companyName: formData.get("companyName") as string,
        customerEmail: formData.get("customerEmail") as string,
        customerPhoneNumberCountryCode: formData.get("countryCode") as string,
        customerPhoneNumber: formData.get("customerPhone") as string,
        appName: formData.get("appName") as string,
      };
      
      // Check if setup already exists for this shop
      const existingSetup = await prisma.customerSetup.findUnique({
        where: {
          shopName: session.shop,
        },
      });
      
      if (existingSetup) {
        // Update existing setup
        await prisma.customerSetup.update({
          where: {
            shopName: session.shop,
          },
          data,
        });
      } else {
        // Create new setup
        await prisma.customerSetup.create({
          data,
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error saving setup data:", error);
      return { success: false, error: "Failed to save setup data" };
    }
  };
  
  export default function SetupPage() {
    const { existingSetup } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    
    // Extract country code and phone number from existing setup
    const existingCountryCode = existingSetup?.customerPhoneNumberCountryCode
    const existingPhone = existingSetup?.customerPhoneNumber
    const [formData, setFormData] = useState({
      companyName: existingSetup?.companyName || "",
      customerEmail: existingSetup?.customerEmail || "",
      customerPhone: existingPhone,
      countryCode: existingCountryCode,
      appName: existingSetup?.appName || "",
    });
  
    const [errors, setErrors] = useState({
      companyName: "",
      customerEmail: "",
      customerPhone: "",
      appName: "",
    });
  
    const countryCodes = [
      { label: "United States (+1)", value: "+1" },
      { label: "United Kingdom (+44)", value: "+44" },
      { label: "Australia (+61)", value: "+61" },
      { label: "Canada (+1)", value: "+1" },
      { label: "India (+91)", value: "+91" },
    ];
  
    const handleSubmit = useCallback(async () => {
      const newErrors = {
        companyName: "",
        customerEmail: "",
        customerPhone: "",
        appName: "",
      };
  
      // Validate company name
      if (!formData.companyName) {
        newErrors.companyName = "Company name is required";
      } else if (formData.companyName.length > 150) {
        newErrors.companyName = "Company name must be less than 150 characters";
      }
  
      // Validate email
      if (!formData.customerEmail) {
        newErrors.customerEmail = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
        newErrors.customerEmail = "Please enter a valid email address";
      }
  
      // Validate phone number
      if (!formData.customerPhone) {
        newErrors.customerPhone = "Phone number is required";
      } else if (!/^\d{10,15}$/.test(formData.customerPhone)) {
        newErrors.customerPhone = "Please enter a valid phone number";
      }
  
      // Validate app name
      if (!formData.appName) {
        newErrors.appName = "App name is required";
      } else if (formData.appName.length > 50) {
        newErrors.appName = "App name must be less than 50 characters";
      }
  
      setErrors(newErrors);
  
      // If no errors, proceed with form submission
      if (Object.values(newErrors).every((error) => !error)) {
        submit(
          {
            ...formData,
            customerPhone: formData.customerPhone || null,
            countryCode: formData.countryCode || null
          },
          { method: "post" }
        );
      }
    }, [formData, submit]);

    const handleChange = useCallback((field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);
  
    return (
      <Page>
        <TitleBar title="Setup" />
        <Layout>
          <Layout.Section>
            <Card>
              <Form onSubmit={handleSubmit}>
                <FormLayout>
                  <TextField
                    label="Company Name"
                    value={formData.companyName}
                    onChange={(value) => handleChange("companyName", value)}
                    error={errors.companyName}
                    requiredIndicator
                    maxLength={150}
                    helpText="Enter your company's full legal name"
                    autoComplete="organization"
                  />
  
                  <TextField
                    label="Customer Contact Email"
                    value={formData.customerEmail}
                    onChange={(value) => handleChange("customerEmail", value)}
                    error={errors.customerEmail}
                    requiredIndicator
                    type="email"
                    helpText="Enter the primary contact email for customer support"
                    autoComplete="email"
                  />
  
                  <FormLayout.Group>
                    <Select
                      label="Country Code"
                      options={countryCodes}
                      value={formData.countryCode}
                      onChange={(value) => handleChange("countryCode", value)}
                    />
                    <TextField
                      label="Customer Contact Phone Number"
                      value={formData.customerPhone}
                      onChange={(value) => handleChange("customerPhone", value)}
                      error={errors.customerPhone}
                      requiredIndicator
                      type="tel"
                      helpText="Enter the contact phone number with area code"
                      autoComplete="tel"
                    />
                  </FormLayout.Group>
  
                  <TextField
                    label="App Name"
                    value={formData.appName}
                    onChange={(value) => handleChange("appName", value)}
                    error={errors.appName}
                    requiredIndicator
                    maxLength={50}
                    helpText="Enter the name of your application"
                    autoComplete="off"
                  />
  
                  <Button submit>
                    {existingSetup ? "Update" : "Save"}
                  </Button>
                </FormLayout>
              </Form>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }