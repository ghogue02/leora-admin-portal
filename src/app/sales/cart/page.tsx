'use client';

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "../_components/CartProvider";
import { useToast } from "../_components/ToastProvider";

export default function CartPage() {
  const { cart, loading, error, itemCount, isMutating, updateItemQuantity, removeItem, checkout } =
    useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    if (!cart) {
      setQuantities({});
      return;
    }
    const next: Record<string, number> = {};
    cart.items.forEach((item) => {
      next[item.id] = item.quantity;
    });
    setQuantities(next);
  }, [cart]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cart?.currency ?? "USD",
        maximumFractionDigits: 2,
      }),
    [cart?.currency],
  );

  const handleQuantityChange = useCallback((itemId: string, value: string) => {
    const numeric = Number.parseInt(value, 10);
    if (Number.isNaN(numeric)) {
      setQuantities((prev) => ({ ...prev, [itemId]: 0 }));
    } else {
      setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, numeric) }));
    }
  }, []);

  const handleQuantityBlur = useCallback(
    async (itemId: string) => {
      if (!cart) return;
      const desired = quantities[itemId];
      const line = cart.items.find((item) => item.id === itemId);
      if (!line) return;

      const normalized = Number.isInteger(desired) ? desired : Math.round(desired ?? line.quantity);
      if (normalized === line.quantity || normalized < 0) return;

      setLocalError(null);

      try {
        if (normalized <= 0) {
          await removeItem(itemId);
        } else {
          await updateItemQuantity(itemId, normalized);
        }
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Unable to update cart item.");
      }
    },
    [cart, quantities, removeItem, updateItemQuantity],
  );

  const handleCheckout = useCallback(async () => {
    if (!cart || cart.items.length === 0) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      const order = await checkout();
      const totalText = currencyFormatter.format(order.total);
      const shortId = order.orderId.slice(0, 8).toUpperCase();
      const recipientLabel = order.customerName ?? "your team";
      pushToast({
        tone: "success",
        title: `Order ${shortId} submitted`,
        description: `Total ${totalText}. Confirmation sent to ${recipientLabel}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit order.";
      setLocalError(message);
      pushToast({
        tone: "error",
        title: "Checkout failed",
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [cart, checkout, currencyFormatter, pushToast]);

  if (loading) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Cart</p>
          <h1 className="text-3xl font-semibold text-gray-900">Review your order.</h1>
        </header>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-gray-600">
          Loading cart…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Cart</p>
          <h1 className="text-3xl font-semibold text-gray-900">Review your order.</h1>
        </header>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Cart</p>
          <h1 className="text-3xl font-semibold text-gray-900">Your cart is empty.</h1>
        </header>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-gray-600">
          Add items from the catalog to build your next order. Inventory and pricing update in real
          time.
        </div>
        <Link
          href="/sales/catalog"
          className="inline-flex w-fit items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          Browse catalog
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Cart</p>
        <h1 className="text-3xl font-semibold text-gray-900">Review your order.</h1>
        <p className="text-sm text-gray-600">
          You have {itemCount} {itemCount === 1 ? "item" : "items"} ready to submit.
        </p>
      </header>

      {localError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700" role="alert">
          {localError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm text-gray-700">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">SKU</th>
              <th scope="col" className="px-4 py-3 text-left">Quantity</th>
              <th scope="col" className="px-4 py-3 text-left">Unit price</th>
              <th scope="col" className="px-4 py-3 text-left">Price list</th>
              <th scope="col" className="px-4 py-3 text-left">Line total</th>
              <th scope="col" className="px-4 py-3 text-left">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {cart.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{item.sku.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.sku.code} • {item.sku.product.brand ?? "Unbranded"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    value={quantities[item.id] ?? item.quantity}
                    onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                    onBlur={() => void handleQuantityBlur(item.id)}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none"
                    disabled={isMutating}
                  />
                </td>
                <td className="px-4 py-3">
                  <p>{currencyFormatter.format(item.pricing.unitPrice)}</p>
                  <p className="text-xs text-gray-500">
                    Min {item.pricing.minQuantity ?? 1}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">
                    {item.pricing.priceListName ?? "Standard"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.pricing.source === "price_list" ? "Price list" : item.pricing.source}
                  </p>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {currencyFormatter.format(item.pricing.lineTotal)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void removeItem(item.id)}
                    className="rounded-md border border-transparent px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    disabled={isMutating}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">Subtotal</p>
          <p className="text-2xl font-semibold text-gray-900">
            {currencyFormatter.format(cart.subtotal)}
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <Link
            href="/sales/catalog"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
          >
            Continue shopping
          </Link>
          <button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={isMutating || submitting || cart.items.length === 0}
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Submitting…" : "Submit order"}
          </button>
        </div>
      </section>
    </main>
  );
}
