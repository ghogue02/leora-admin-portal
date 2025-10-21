'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCustomer } from "./CustomerProvider";

type CartSku = {
  id: string;
  code: string;
  size: string | null;
  unitOfMeasure: string | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
  };
  priceLists: Array<{
    id: string;
    priceListId: string;
    priceListName: string;
    price: number;
    currency: string;
    minQuantity: number | null;
    maxQuantity: number | null;
  }>;
};

type CartItem = {
  id: string;
  skuId: string;
  quantity: number;
  sku: CartSku;
  pricing: {
    unitPrice: number;
    lineTotal: number;
    currency: string;
    source: string;
    priceListId: string | null;
    priceListName: string | null;
    minQuantity: number | null;
    maxQuantity: number | null;
  };
};

export type CartData = {
  id: string;
  status: string;
  portalUserId: string;
  updatedAt: string;
  currency: string;
  subtotal: number;
  items: CartItem[];
};

type CartResponse = {
  cart: CartData;
};

type OrderSubmissionResult = {
  orderId: string;
  status: string;
  total: number;
  currency: string;
  orderedAt: string;
  customerName: string | null;
};

type CartContextValue = {
  cart: CartData | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  isMutating: boolean;
  addItem: (skuId: string, quantity?: number) => Promise<void>;
  updateItemQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  refresh: () => Promise<void>;
  checkout: () => Promise<OrderSubmissionResult>;
};

const CartContext = createContext<CartContextValue | null>(null);

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const { customerId } = useCustomer();

  const fetchCart = useCallback(async () => {
    // Don't fetch cart if no customer is selected
    if (!customerId) {
      setCart(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sales/cart?customerId=${customerId}`, { cache: "no-store" }).catch(() => null);

      // If fetch failed or no response, silently return
      if (!response) {
        setCart(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        // Silently handle 401 (not authenticated) - expected before login
        // Silently handle 400 (bad request) - expected when no customerId is in context
        if (response.status === 401 || response.status === 400) {
          setCart(null);
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to load cart.");
      }
      const payload = (await response.json()) as CartResponse;
      setCart(payload.cart);
    } catch (err) {
      // Don't log cart errors when they're expected (no customerId context)
      // Only log unexpected errors
      if (err instanceof Error && !err.message.includes("customerId") && !err.message.includes("400")) {
        console.error("Cart load failed:", err);
      }
      setError(err instanceof Error ? err.message : "Unable to load cart.");
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  const mutateCart = useCallback(async (request: () => Promise<Response>) => {
    setIsMutating(true);
    setError(null);
    try {
      const response = await request();
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Cart update failed.");
      }
      const payload = (await response.json()) as CartResponse;
      setCart(payload.cart);
    } catch (err) {
      console.error("Cart mutation failed:", err);
      setError(err instanceof Error ? err.message : "Cart update failed.");
      throw err instanceof Error ? err : new Error("Cart update failed.");
    } finally {
      setIsMutating(false);
    }
  }, []);

  const addItem = useCallback(
    async (skuId: string, quantity = 1) => {
      await mutateCart(() =>
        fetch("/api/sales/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skuId, quantity }),
        }),
      );
    },
    [mutateCart],
  );

  const updateItemQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      await mutateCart(() =>
        fetch("/api/sales/cart/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId, quantity }),
        }),
      );
    },
    [mutateCart],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      await updateItemQuantity(cartItemId, 0);
    },
    [updateItemQuantity],
  );

  const checkout = useCallback(async () => {
    setIsMutating(true);
    setError(null);
    try {
      const response = await fetch("/api/sales/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to submit order.");
      }

      const payload = (await response.json()) as {
        cart: CartData;
        order: OrderSubmissionResult;
      };

      setCart(payload.cart);
      return payload.order;
    } catch (err) {
      console.error("Cart checkout failed:", err);
      const message = err instanceof Error ? err.message : "Unable to submit order.";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      error,
      isMutating,
      itemCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
      addItem,
      updateItemQuantity,
      removeItem,
      refresh: fetchCart,
      checkout,
    }),
    [cart, loading, error, isMutating, addItem, updateItemQuantity, removeItem, fetchCart, checkout],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }
  return context;
}
