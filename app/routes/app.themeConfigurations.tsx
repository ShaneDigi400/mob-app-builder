import {
  Page,
  Layout,
  Card,
  Form,
  FormLayout,
  TextField,
  ColorPicker,
  Button,
  RadioButton,
  Box,
  BlockStack,
  InlineStack,
  Banner,
  RangeSlider,
  Collapsible,
  TextContainer,
} from "@shopify/polaris";
import { useState, useCallback, useRef, useEffect } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { themeData } from "../static-data/theme-data";
import { useSubmit, useLoaderData, useActionData, useNavigate } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { getExistingTheme, saveOrUpdateTheme } from "../lib/actions/themeConfigurations/themeConfigurationsActions";
import { getExistingSetup } from "../lib/actions/setUp/setUpActions";
import { json } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Check if setup is completed
  const existingSetup = await getExistingSetup(session.shop);
  if (!existingSetup) {
    return json({ 
      error: "Please complete the setup first", 
      redirectTo: "/app/setUp" 
    } as const, { status: 403 });
  }
  
  // Get existing theme configuration for the shop
  const existingTheme = await getExistingTheme(session.shop);
  
  return json({ existingTheme } as const);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const data = {
    themeCode: formData.get("themeCode") as string,
    primaryColor: formData.get("primaryColor") as string,
    secondaryColor: formData.get("secondaryColor") as string,
    backgroundColor: formData.get("backgroundColor") as string,
    buttonColor: formData.get("buttonColor") as string,
    appBarBackgroundColor: formData.get("appBarBackgroundColor") as string,
    buttonRadius: formData.get("buttonRadius") as string,
    edgePadding: formData.get("edgePadding") as string,
    splashScreenWidth: formData.get("splashScreenWidth") as string,
  };

  // Validate all fields are filled
  if (!data.themeCode || !data.primaryColor || !data.secondaryColor || 
      !data.backgroundColor || !data.buttonColor || !data.appBarBackgroundColor || 
      !data.buttonRadius || !data.edgePadding || !data.splashScreenWidth) {
    return { success: false, error: "All fields are required" };
  }
  
  return saveOrUpdateTheme(session.shop, data);
};

export default function ThemeConfigurationsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const actionData = useActionData<{ success: boolean; error?: string; message?: string }>();
  const submit = useSubmit();
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [formData, setFormData] = useState({
    themeCode: "",
    primaryColor: "",
    secondaryColor: "",
    backgroundColor: "",
    buttonColor: "",
    appBarBackgroundColor: "",
    buttonRadius: "",
    edgePadding: "",
    splashScreenWidth: "",
  });

  // Redirect if setup is not completed
  useEffect(() => {
    if ('error' in loaderData && 'redirectTo' in loaderData) {
      shopify.toast.show(loaderData.error, { isError: true });
      // Add a small delay before redirect to show the toast
      setTimeout(() => {
        navigate(loaderData.redirectTo);
      }, 1000);
    }
  }, [loaderData, navigate]);

  const existingTheme = 'existingTheme' in loaderData ? loaderData.existingTheme : null;

  // Load existing theme data if it exists
  useEffect(() => {
    if (existingTheme) {
      setFormData({
        themeCode: existingTheme.themeCode,
        primaryColor: existingTheme.primaryColor,
        secondaryColor: existingTheme.secondaryColor,
        backgroundColor: existingTheme.backgroundColor,
        buttonColor: existingTheme.buttonColor,
        appBarBackgroundColor: existingTheme.appBarBackgroundColor,
        buttonRadius: existingTheme.buttonRadius,
        edgePadding: existingTheme.edgePadding,
        splashScreenWidth: existingTheme.splashScreenWidth,
      });
      setSelectedTheme(existingTheme.themeCode);
    }
  }, [existingTheme]);

  // Show toast notifications based on action result
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        shopify.toast.show(actionData.message || "Theme configuration saved successfully!")
      } else {
        shopify.toast.show(actionData.error || "Failed to save theme configuration", { isError: true });
      }
    }
  }, [actionData]);

  const handleThemeChange = useCallback((value: string) => {
    setSelectedTheme(value);
    const theme = themeData.find(t => t.themeCode === value);
    if (theme) {
      setFormData({
        themeCode: theme.themeCode,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        backgroundColor: theme.backgroundColor,
        buttonColor: theme.buttonColor,
        appBarBackgroundColor: theme.appBarBackgroundColor,
        buttonRadius: theme.buttonRadius,
        edgePadding: theme.edgePadding,
        splashScreenWidth: theme.splashScreenWidth,
      });
    } else {
      // Reset all fields if no theme is selected
      setFormData({
        themeCode: "",
        primaryColor: "",
        secondaryColor: "",
        backgroundColor: "",
        buttonColor: "",
        appBarBackgroundColor: "",
        buttonRadius: "",
        edgePadding: "",
        splashScreenWidth: "",
      });
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedTheme) {
      shopify.toast.show("Please select a theme");
      return;
    }
    submit(formData, { method: "post" });
  }, [formData, submit, selectedTheme]);

  const handleColorChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSplashWidthChange = useCallback((value: number) => {
    setFormData(prev => ({ ...prev, splashScreenWidth: `${value}%` }));
  }, []);

  const handleDiscardChanges = useCallback(() => {
    // Check if there are any changes to discard
    const hasChanges = existingTheme ? (
      formData.themeCode !== existingTheme.themeCode ||
      formData.primaryColor !== existingTheme.primaryColor ||
      formData.secondaryColor !== existingTheme.secondaryColor ||
      formData.backgroundColor !== existingTheme.backgroundColor ||
      formData.buttonColor !== existingTheme.buttonColor ||
      formData.appBarBackgroundColor !== existingTheme.appBarBackgroundColor ||
      formData.buttonRadius !== existingTheme.buttonRadius ||
      formData.edgePadding !== existingTheme.edgePadding ||
      formData.splashScreenWidth !== existingTheme.splashScreenWidth
    ) : (
      formData.themeCode !== "" ||
      formData.primaryColor !== "" ||
      formData.secondaryColor !== "" ||
      formData.backgroundColor !== "" ||
      formData.buttonColor !== "" ||
      formData.appBarBackgroundColor !== "" ||
      formData.buttonRadius !== "" ||
      formData.edgePadding !== "" ||
      formData.splashScreenWidth !== ""
    );

    if (!hasChanges) {
      shopify.toast.show("No changes to discard.");
      return;
    }

    if (existingTheme) {
      setFormData({
        themeCode: existingTheme.themeCode,
        primaryColor: existingTheme.primaryColor,
        secondaryColor: existingTheme.secondaryColor,
        backgroundColor: existingTheme.backgroundColor,
        buttonColor: existingTheme.buttonColor,
        appBarBackgroundColor: existingTheme.appBarBackgroundColor,
        buttonRadius: existingTheme.buttonRadius,
        edgePadding: existingTheme.edgePadding,
        splashScreenWidth: existingTheme.splashScreenWidth,
      });
      setSelectedTheme(existingTheme.themeCode);
    } else {
      setFormData({
        themeCode: "",
        primaryColor: "",
        secondaryColor: "",
        backgroundColor: "",
        buttonColor: "",
        appBarBackgroundColor: "",
        buttonRadius: "",
        edgePadding: "",
        splashScreenWidth: "",
      });
      setSelectedTheme("");
    }
    shopify.toast.show("Changes discarded. Form restored to last saved state.");
  }, [existingTheme, formData]);

  const handleResetToDefaults = useCallback(() => {
    if (selectedTheme) {
      const theme = themeData.find(t => t.themeCode === selectedTheme);
      if (theme) {
        setFormData({
          themeCode: theme.themeCode,
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          backgroundColor: theme.backgroundColor,
          buttonColor: theme.buttonColor,
          appBarBackgroundColor: theme.appBarBackgroundColor,
          buttonRadius: theme.buttonRadius,
          edgePadding: theme.edgePadding,
          splashScreenWidth: theme.splashScreenWidth,
        });
        shopify.toast.show("Theme values reset to defaults. Click 'Update Theme Configuration' to save these changes.");
      }
    }
  }, [selectedTheme]);

  const handleButtonRadiusChange = useCallback((value: number) => {
    setFormData(prev => ({ ...prev, buttonRadius: `${value}px` }));
  }, []);

  const handleEdgePaddingChange = useCallback((value: number) => {
    setFormData(prev => ({ ...prev, edgePadding: `${value}px` }));
  }, []);

  // color picker component
  const ColorPickerComponent = ({ label, color, onChange }: { label: string, color: string, onChange: (value: string) => void }) => {
    // Convert hex to HSB
    const hexToHSB = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      
      let h = 0;
      if (max !== min) {
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      
      return {
        hue: h * 360,
        saturation: max === 0 ? 0 : d / max,
        brightness: max,
      };
    };

    // Convert HSB to hex
    const hsbToHex = (hsb: { hue: number; saturation: number; brightness: number }) => {
      const h = hsb.hue / 360;
      const s = hsb.saturation;
      const v = hsb.brightness;
      
      let r = 0, g = 0, b = 0;
      
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      
      switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
      }
      
      const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const [inputValue, setInputValue] = useState(color);
    const [showPicker, setShowPicker] = useState(false);
    const [selectedColor, setSelectedColor] = useState(color);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setInputValue(color);
      setSelectedColor(color);
    }, [color]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
          setShowPicker(false);
          onChange(selectedColor);
        }
      };

      if (showPicker) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showPicker, selectedColor, onChange]);

    const handleHexChange = (value: string) => {
      // Remove any existing # from the input
      const cleanValue = value.replace('#', '');
      
      // Only allow valid hex characters
      const validHex = cleanValue.replace(/[^0-9A-Fa-f]/g, '');
      
      // Limit to 6 characters
      const limitedHex = validHex.slice(0, 6);
      
      // Update the input value
      const newColor = `#${limitedHex}`;
      setInputValue(newColor);
      setSelectedColor(newColor);
    };

    const handleHexBlur = () => {
      // Only update the color if we have a valid 6-character hex
      if (inputValue.length === 7) { // including the #
        setSelectedColor(inputValue);
        onChange(inputValue);
      } else {
        // Reset to the previous valid color if invalid
        setInputValue(color);
        setSelectedColor(color);
      }
    };

    return (
      <FormLayout.Group>
        <div style={{ display: 'flex', alignItems: 'end', gap: '1rem', position: 'relative' }}>
          <TextField
            label={label}
            value={inputValue}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            autoComplete="off"
            maxLength={7}
            prefix="(Hex): "
          />
          <div 
            style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: selectedColor, 
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={() => setShowPicker(true)}
          />
          {showPicker && (
            <div 
              ref={pickerRef}
              style={{ 
                position: 'absolute', 
                zIndex: 1000, 
                top: '10%',
                left: '300px',
                marginLeft: '8px',
                transform: 'translateY(-50%)',
                backgroundColor: 'white',
                padding: '8px',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <ColorPicker
                  key={color}
                  color={hexToHSB(selectedColor)}
                  onChange={(value) => {
                    const newColor = hsbToHex(value);
                    setSelectedColor(newColor);
                    setInputValue(newColor);
                  }}
                  allowAlpha={false}
                />
              </div>
            </div>
          )}
        </div>
      </FormLayout.Group>
    );
  };

  return (
    <Page>
      <TitleBar title="Theme Configurations" />
      <Layout>
        <Layout.Section>
          <Card>
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                {actionData?.error && (
                  <Banner tone="critical">
                    <p>{actionData.error}</p>
                  </Banner>
                )}
                
                <Box paddingBlock="400">
                  <BlockStack gap="400">
                    <Box>
                      <h2>Select Theme</h2>
                    </Box>
                    <InlineStack gap="400" wrap>
                      {themeData.map((theme) => (
                        <Box
                          key={theme.themeCode}
                          padding="400"
                          width="300px"
                          borderWidth="025"
                          borderColor="border"
                          borderRadius="200"
                          background="bg-surface"
                        >
                          <BlockStack gap="200">
                            <RadioButton
                              label={theme.themeName}
                              checked={selectedTheme === theme.themeCode}
                              onChange={() => handleThemeChange(theme.themeCode)}
                            />
                            <Box
                              padding="400"
                              background="bg-surface"
                              borderWidth="025"
                              borderColor="border"
                              borderRadius="200"
                            >
                              <Box
                                padding="400"
                                background="bg-surface"
                                borderRadius="200"
                              >
                                <Box
                                  padding="400"
                                  background="bg-surface"
                                  borderRadius="200"
                                />
                              </Box>
                            </Box>
                          </BlockStack>
                        </Box>
                      ))}
                    </InlineStack>
                  </BlockStack>
                </Box>

                <TextField
                  label="Theme Code"
                  value={formData.themeCode}
                  disabled
                  autoComplete="off"    
                />
                
                <ColorPickerComponent
                  label="Primary Color"
                  color={formData.primaryColor}
                  onChange={(value) => handleColorChange("primaryColor", value)}
                />
                
                <ColorPickerComponent
                  label="Background Color"
                  color={formData.backgroundColor}
                  onChange={(value) => handleColorChange("backgroundColor", value)}
                />

                <ColorPickerComponent
                  label="Button Color"
                  color={formData.buttonColor}
                  onChange={(value) => handleColorChange("buttonColor", value)}
                />  

                <ColorPickerComponent
                  label="App Bar Background Color"
                  color={formData.appBarBackgroundColor}
                  onChange={(value) => handleColorChange("appBarBackgroundColor", value)}
                />

                <Box paddingBlock="400">
                  <BlockStack gap="400">
                  <div style={{width: '200px'}}>
                    <Button
                      onClick={() => setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen)}
                      ariaExpanded={isAdvancedSettingsOpen}
                      ariaControls="advanced-settings"
                    >
                      {isAdvancedSettingsOpen ? "Hide Advanced Settings" : "Show Advanced Settings"}
                    </Button>
                    </div>
                    <Collapsible
                      open={isAdvancedSettingsOpen}
                      id="advanced-settings"
                      transition={{duration: '500ms', timingFunction: 'ease-in-out'}}
                      expandOnPrint
                    >
                      <TextContainer>
                        <BlockStack gap="400">
                          <RangeSlider
                            label="Button Radius"
                            value={parseInt(formData.buttonRadius) || 0}
                            onChange={handleButtonRadiusChange}
                            min={0}
                            max={20}
                            step={1}
                            output
                            suffix={`${parseInt(formData.buttonRadius) || 0}px`}
                            helpText="Adjust the button border radius"
                          />

                          <RangeSlider
                            label="Edge Padding"
                            value={parseInt(formData.edgePadding) || 0}
                            onChange={handleEdgePaddingChange}
                            min={0}
                            max={80}
                            step={1}
                            output
                            suffix={`${parseInt(formData.edgePadding) || 0}px`}
                            helpText="Adjust the edge padding"
                          />

                          <RangeSlider
                            label="Splash Screen Width"
                            value={parseInt(formData.splashScreenWidth) || 0}
                            onChange={handleSplashWidthChange}
                            min={0}
                            max={100}
                            step={1}
                            output
                            suffix={`${parseInt(formData.splashScreenWidth) || 0}%`}
                            helpText="Adjust the width of the splash screen"
                          />
                        </BlockStack>
                      </TextContainer>
                    </Collapsible>
                  </BlockStack>
                </Box>

                <InlineStack gap="400">
                  <Button submit>
                    {existingTheme ? "Update Theme Configuration" : "Save Theme Configuration"}
                  </Button>
                  <Button onClick={handleDiscardChanges}>
                    Discard Changes
                  </Button>
                  <Button onClick={handleResetToDefaults}>
                    Reset to Defaults
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
