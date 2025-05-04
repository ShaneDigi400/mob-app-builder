import {
    Page,
    Layout,
    Card,
    Form,
    FormLayout,
    TextField,
    Select,
    Button,
    InlineStack,
  } from "@shopify/polaris";
  import { useState, useCallback, useEffect } from "react";
  import { TitleBar } from "@shopify/app-bridge-react";
  import { authenticate } from "../shopify.server";
  import { useSubmit, useLoaderData, useActionData } from "@remix-run/react";
  import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
  import { countryCodes } from "../static-data/country-codes";
  import { getExistingSetup, saveOrUpdateSetup } from "../lib/actions/setUp/setUpActions";
  
  export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    
    // Get existing setup data for the shop
    const existingSetup = await getExistingSetup(session.shop);
    
    return { existingSetup };
  };
  
  export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    
    const data = {
      companyName: formData.get("companyName") as string,
      customerEmail: formData.get("customerEmail") as string,
      customerPhoneNumberCountryCode: formData.get("countryCode") as string,
      customerPhoneNumber: formData.get("customerPhone") as string,
      appName: formData.get("appName") as string,
    };
    
    return saveOrUpdateSetup(session.shop, data);
  };
  
  export default function SetupPage() {
    const { existingSetup } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    
    // Show toast notifications based on action result
    useEffect(() => {
      if (actionData) {
        if (actionData.success) {
          shopify.toast.show(actionData.message);
        } else {
          shopify.toast.show(actionData.message, { isError: true });
        }
      }
    }, [actionData]);

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

    const handleDiscardChanges = useCallback(() => {
      // Check if there are any changes to discard
      const hasChanges = existingSetup ? (
        formData.companyName !== existingSetup.companyName ||
        formData.customerEmail !== existingSetup.customerEmail ||
        formData.customerPhone !== existingSetup.customerPhoneNumber ||
        formData.countryCode !== existingSetup.customerPhoneNumberCountryCode ||
        formData.appName !== existingSetup.appName
      ) : (
        formData.companyName !== "" ||
        formData.customerEmail !== "" ||
        formData.customerPhone !== "" ||
        formData.countryCode !== "" ||
        formData.appName !== ""
      );

      if (!hasChanges) {
        shopify.toast.show("No changes to discard.");
        return;
      }

      if (existingSetup) {
        setFormData({
          companyName: existingSetup.companyName,
          customerEmail: existingSetup.customerEmail,
          customerPhone: existingSetup.customerPhoneNumber,
          countryCode: existingSetup.customerPhoneNumberCountryCode,
          appName: existingSetup.appName,
        });
      } else {
        setFormData({
          companyName: "",
          customerEmail: "",
          customerPhone: "",
          countryCode: "",
          appName: "",
        });
      }
      setErrors({
        companyName: "",
        customerEmail: "",
        customerPhone: "",
        appName: "",
      });
      shopify.toast.show("Changes discarded. Form restored to last saved state.");
    }, [existingSetup, formData]);
  
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
  
                  <InlineStack gap="400">
                    <Button variant="primary" submit>
                      {existingSetup ? "Update" : "Save"}
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