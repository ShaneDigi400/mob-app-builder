import { useNavigate } from "@remix-run/react";

interface RedirectData {
  error: string;
  redirectTo: string;
}

export function useRedirectWithToast() {
  const navigate = useNavigate();

  const redirectWithToast = (data: RedirectData) => {
    shopify.toast.show(data.error, { isError: true });
    // Add a small delay before redirect to show the toast
    setTimeout(() => {
      navigate(data.redirectTo);
    }, 1000);
  };

  return redirectWithToast;
} 