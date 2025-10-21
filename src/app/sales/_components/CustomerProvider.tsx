'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type CustomerContextValue = {
  customerId: string | null;
  setCustomerId: (customerId: string | null) => void;
  clearCustomer: () => void;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

const STORAGE_KEY = 'sales-selected-customer';

export default function CustomerProvider({ children }: { children: ReactNode }) {
  const [customerId, setCustomerIdState] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCustomerIdState(stored);
    }
  }, []);

  const setCustomerId = useCallback((id: string | null) => {
    setCustomerIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearCustomer = useCallback(() => {
    setCustomerId(null);
  }, [setCustomerId]);

  return (
    <CustomerContext.Provider value={{ customerId, setCustomerId, clearCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error("useCustomer must be used within a CustomerProvider.");
  }
  return context;
}
