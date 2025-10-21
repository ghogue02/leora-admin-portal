'use client';

import { useEffect } from "react";
import { useCustomer } from "../../../_components/CustomerProvider";

type CustomerContextSetterProps = {
  customerId: string;
};

/**
 * Client component that sets the customer context when viewing a customer detail page.
 * This ensures the cart and other customer-specific features work correctly.
 */
export default function CustomerContextSetter({ customerId }: CustomerContextSetterProps) {
  const { setCustomerId } = useCustomer();

  useEffect(() => {
    setCustomerId(customerId);

    // Optional: Clear customer context when leaving the page
    return () => {
      // Keep the customer selected even when navigating away
      // This improves UX by keeping cart context
    };
  }, [customerId, setCustomerId]);

  return null; // This component doesn't render anything
}
