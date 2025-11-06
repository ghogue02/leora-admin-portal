'use client';

/**
 * Edit Order Page (After Invoice)
 *
 * Phase 3 Sprint 1: Feature #4
 *
 * Allows sales reps to edit orders that already have invoices.
 * - Reuses existing order creation form/components
 * - Pre-populates with current order data
 * - Warns that editing will regenerate the invoice
 * - Locks certain fields (customer, created date)
 * - Allows editing: delivery date, warehouse, products, quantities, special instructions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { showSuccess, showError, notifications } from '@/lib/toast-helpers';
import { ButtonWithLoading } from '@/components/ui/button-variants';
import { ProductGrid } from '@/components/orders/ProductGrid';
import { DeliveryDatePicker } from '@/components/orders/DeliveryDatePicker';
import { WarehouseSelector } from '@/components/orders/WarehouseSelector';
import { OrderSummarySidebar } from '@/components/orders/OrderSummarySidebar';
import { OrderPreviewModal } from '@/components/orders/OrderPreviewModal';
import { resolvePriceForQuantity, PriceListSummary, PricingSelection, CustomerPricingContext, describePriceListForDisplay } from '@/components/orders/pricing-utils';

type Customer = {
  id: string;
  name: string;
  territory: string | null;
  state: string | null;
  accountNumber: string | null;
  requiresPO: boolean;
  defaultWarehouseLocation: string | null;
  defaultDeliveryTimeWindow: string | null;
  paymentTerms: string | null;
};

type InventoryStatus = {
  onHand: number;
  allocated: number;
  available: number;
  sufficient: boolean;
  warningLevel: 'none' | 'low' | 'critical';
};

type OrderItem = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inventoryStatus: InventoryStatus | null;
  pricing: PricingSelection;
  priceLists: PriceListSummary[];
};

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  // Original order data
  const [originalOrder, setOriginalOrder] = useState<any>(null);

  // Form state (pre-populated from original order)
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [warehouseLocation, setWarehouseLocation] = useState<string>('');
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [splitCaseFee, setSplitCaseFee] = useState<number>(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [salesRepDeliveryDays, setSalesRepDeliveryDays] = useState<string[]>([]);

  const customerPricingContext = useMemo<CustomerPricingContext | null>(() => {
    if (!customer) return null;
    return {
      state: customer.state,
      territory: customer.territory,
      accountNumber: customer.accountNumber,
      name: customer.name,
    };
  }, [customer]);

  // Load existing order data
  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      try {
        const response = await fetch(`/api/sales/orders/${orderId}`);
        if (response.status === 401 || response.status === 403) {
          const redirect = encodeURIComponent(`/sales/orders/${orderId}/edit`);
          router.push(`/sales/login?redirect=${redirect}`);
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to load order');
        }
        const data = await response.json();
        const order = data.order;

        setOriginalOrder(order);

        // Pre-populate form fields
        setCustomer({
          id: order.customer.id,
          name: order.customer.name,
          territory: order.customer.territory || null,
          state: order.customer.state || null,
          accountNumber: order.customer.accountNumber || null,
          requiresPO: order.customer.requiresPO || false,
          defaultWarehouseLocation: order.customer.defaultWarehouseLocation || null,
          defaultDeliveryTimeWindow: order.customer.defaultDeliveryTimeWindow || null,
          paymentTerms: order.customer.paymentTerms || null,
        });

        setDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : '');
        setWarehouseLocation(order.warehouseLocation || 'main');
        setDeliveryTimeWindow(order.deliveryTimeWindow || 'anytime');
        setPoNumber(order.poNumber || '');
        setSpecialInstructions(order.specialInstructions || '');

        // Convert order lines to order items
        const items: OrderItem[] = order.lines.map((line: any) => ({
          skuId: line.skuId,
          skuCode: line.sku.code,
          productName: line.sku.product.name,
          brand: line.sku.product.brand,
          size: line.sku.size,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.unitPrice) * line.quantity,
          inventoryStatus: null, // Will be loaded when product selector opens
          pricing: {
            unitPrice: Number(line.unitPrice),
            priceList: null, // Will be resolved from price lists
            overrideApplied: line.priceOverridden || false,
            reason: line.overrideReason || undefined,
          },
          priceLists: [], // Will be loaded when product selector opens
        }));
        setOrderItems(items);

      } catch (error) {
        console.error('Failed to load order:', error);
        showError('Failed to load order', error instanceof Error ? error.message : 'Unknown error');
        router.push('/sales/orders');
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId, router]);

  // Load sales rep delivery days
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/sales/profile');
        if (response.ok) {
          const profileData = await response.json();
          const deliveryDays = profileData.salesRep?.deliveryDaysArray || [];
          setSalesRepDeliveryDays(deliveryDays);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }
    void loadProfile();
  }, []);

  // Add product to order
  const handleAddProduct = useCallback((product: any, quantityFromGrid: number, inventoryStatus: InventoryStatus | undefined, pricing: PricingSelection) => {
    const unitPrice = pricing.unitPrice || product.pricePerUnit || 0;
    const quantity = Math.max(1, quantityFromGrid);

    const newItem: OrderItem = {
      skuId: product.skuId,
      skuCode: product.skuCode,
      productName: product.productName,
      brand: product.brand,
      size: product.size,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
      inventoryStatus,
      pricing,
      priceLists: product.priceLists as PriceListSummary[],
    };

    setOrderItems(prev => [...prev, newItem]);
    setShowProductSelector(false);

    notifications.productAdded(product.productName, quantity, quantity * unitPrice);
  }, []);

  // Add multiple products at once
  const handleAddMultipleProducts = useCallback((products: Array<{
    product: any;
    quantity: number;
    inventoryStatus: InventoryStatus | undefined;
    pricing: PricingSelection;
  }>) => {
    const newItems: OrderItem[] = products.map(({ product, quantity, inventoryStatus, pricing }) => {
      const unitPrice = pricing.unitPrice || product.pricePerUnit || 0;
      const actualQuantity = Math.max(1, quantity);

      return {
        skuId: product.skuId,
        skuCode: product.skuCode,
        productName: product.productName,
        brand: product.brand,
        size: product.size,
        quantity: actualQuantity,
        unitPrice,
        lineTotal: actualQuantity * unitPrice,
        inventoryStatus,
        pricing,
        priceLists: product.priceLists as PriceListSummary[],
      };
    });

    setOrderItems(prev => [...prev, ...newItems]);
    setShowProductSelector(false);

    notifications.productAdded(
      `${newItems.length} products`,
      newItems.reduce((sum, item) => sum + item.quantity, 0),
      newItems.reduce((sum, item) => sum + item.lineTotal, 0),
      `Added ${newItems.length} products to order`
    );
  }, []);

  // Calculate order total
  const orderTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return !!(
      customer &&
      deliveryDate &&
      warehouseLocation &&
      orderItems.length > 0
    );
  }, [customer, deliveryDate, warehouseLocation, orderItems.length]);

  // Show preview modal before submission
  const handleShowPreview = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      showError('Validation error', 'Please complete all required fields');
      return;
    }

    setShowPreviewModal(true);
  }, [isFormValid]);

  // Submit updated order
  const handleConfirmSubmit = useCallback(async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/sales/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate,
          warehouseLocation,
          deliveryTimeWindow,
          poNumber: poNumber.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
          items: orderItems.map(item => ({
            skuId: item.skuId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order');
      }

      const result = await response.json();

      showSuccess(
        'Order updated successfully',
        result.invoiceRegenerated
          ? 'Invoice has been regenerated with updated order details'
          : 'Order details have been updated'
      );

      setShowPreviewModal(false);
      router.push(`/sales/orders/${orderId}`);
    } catch (err) {
      showError('Update failed', err instanceof Error ? err.message : 'Unknown error');
      setShowPreviewModal(false);
    } finally {
      setSubmitting(false);
    }
  }, [orderId, deliveryDate, warehouseLocation, deliveryTimeWindow, poNumber, specialInstructions, orderItems, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <p>Loading order...</p>
      </div>
    );
  }

  if (!originalOrder || !customer) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <p className="text-rose-600">Order not found or you don't have access to this order.</p>
        <Link href="/sales/orders" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Order</h1>
          <p className="mt-1 text-sm text-gray-600">
            Order #{originalOrder.id.substring(0, 8)} · {customer.name}
          </p>
        </div>
        <Link
          href={`/sales/orders/${orderId}`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
        >
          Cancel
        </Link>
      </header>

      {/* Warning Banner */}
      <div className="mb-6 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Editing This Order Will Regenerate the Invoice</p>
            <p className="mt-1 text-sm text-amber-700">
              Any changes you make will update the order and automatically regenerate the invoice PDF.
              The invoice number will remain the same, but the content will reflect your updates.
            </p>
            {originalOrder.invoices?.[0] && (
              <p className="mt-2 text-sm text-amber-700">
                Current Invoice: <span className="font-medium">{originalOrder.invoices[0].invoiceNumber}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Form + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Form Column */}
        <form onSubmit={handleShowPreview} className="space-y-6">
          {/* Section 1: Customer Information (LOCKED) */}
          <section className="rounded-lg border border-slate-200 bg-gray-50 p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Customer Information (Locked)</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Customer Name</p>
                <p className="font-medium text-gray-900">{customer.name}</p>
              </div>
              {customer.accountNumber && (
                <div>
                  <p className="text-sm text-gray-600">Account Number</p>
                  <p className="font-medium text-gray-900">{customer.accountNumber}</p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3">
                🔒 Customer cannot be changed when editing an existing order
              </p>
            </div>
          </section>

          {/* Section 2: Delivery Settings */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Delivery Settings</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700">
                  Delivery Date <span className="text-rose-600">*</span>
                </label>
                <DeliveryDatePicker
                  value={deliveryDate}
                  onChange={setDeliveryDate}
                  deliveryDays={salesRepDeliveryDays}
                />
              </div>

              <div>
                <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700">
                  Warehouse Location <span className="text-rose-600">*</span>
                </label>
                <WarehouseSelector
                  value={warehouseLocation}
                  onChange={setWarehouseLocation}
                />
              </div>

              <div>
                <label htmlFor="timeWindow" className="block text-sm font-medium text-gray-700">
                  Delivery Time Window
                </label>
                <select
                  id="timeWindow"
                  value={deliveryTimeWindow}
                  onChange={(e) => setDeliveryTimeWindow(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
                >
                  <option value="anytime">Anytime</option>
                  <option value="8am-12pm">Morning (8am - 12pm)</option>
                  <option value="12pm-5pm">Afternoon (12pm - 5pm)</option>
                  <option value="after-5pm">Evening (After 5pm)</option>
                </select>
              </div>

              <div>
                <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700">
                  PO Number
                </label>
                <input
                  id="poNumber"
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Customer PO number"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">
                  Special Instructions
                </label>
                <textarea
                  id="instructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Delivery instructions, gate codes, special handling requirements, etc."
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Products */}
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Products</h2>
              <ButtonWithLoading
                type="button"
                onClick={() => setShowProductSelector(true)}
                variant="primary"
              >
                Add/Edit Products ({orderItems.length})
              </ButtonWithLoading>
            </div>

            {orderItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-600">
                  No products in order. Click "Add/Edit Products" to modify.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Product
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Total
                      </th>
                      <th className="px-4 py-3 text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {orderItems.map((item, index) => (
                      <tr key={item.skuId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">
                            {item.skuCode} {item.size && `• ${item.size}`}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              const pricing = resolvePriceForQuantity(
                                item.priceLists,
                                Math.max(newQty, 1),
                                customerPricingContext ?? undefined,
                              );
                              const effectivePricing: PricingSelection =
                                pricing.priceList || !item.pricing.priceList
                                  ? pricing
                                  : {
                                      priceList: item.pricing.priceList,
                                      unitPrice: item.unitPrice,
                                      overrideApplied: true,
                                      reason: "manualOverride",
                                    };
                              const resolvedUnitPrice = effectivePricing.unitPrice || item.unitPrice;
                              const newItems = [...orderItems];
                              newItems[index] = {
                                ...item,
                                quantity: Math.max(newQty, 1),
                                unitPrice: resolvedUnitPrice,
                                lineTotal: Math.max(newQty, 1) * resolvedUnitPrice,
                                pricing: effectivePricing,
                              };
                              setOrderItems(newItems);
                            }}
                            min="1"
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right focus:border-gray-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          ${item.lineTotal.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setOrderItems(orderItems.filter((_, i) => i !== index));
                            }}
                            className="text-xs font-semibold text-rose-600 transition hover:text-rose-800"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/sales/orders/${orderId}`}
              className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Cancel
            </Link>
            <ButtonWithLoading
              type="submit"
              loading={submitting}
              loadingText="Updating Order..."
              variant="primary"
              size="lg"
              disabled={!isFormValid || submitting}
            >
              Update Order & Regenerate Invoice
            </ButtonWithLoading>
          </div>
        </form>

        {/* Sidebar Column */}
        <OrderSummarySidebar
          customer={customer}
          deliveryDate={deliveryDate}
          warehouseLocation={warehouseLocation}
          deliveryTimeWindow={deliveryTimeWindow}
          poNumber={poNumber}
          items={orderItems}
          onRemoveItem={(skuId) => {
            setOrderItems(orderItems.filter(item => item.skuId !== skuId));
          }}
          requiresApproval={false}
          deliveryFee={deliveryFee}
          splitCaseFee={splitCaseFee}
          onDeliveryFeeChange={setDeliveryFee}
          onSplitCaseFeeChange={setSplitCaseFee}
        />
      </div>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Products in Order</h3>
              <button
                type="button"
                onClick={() => setShowProductSelector(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <ProductGrid
              warehouseLocation={warehouseLocation}
              onAddProduct={handleAddProduct}
              onAddMultipleProducts={handleAddMultipleProducts}
              existingSkuIds={orderItems.map(item => item.skuId)}
              customer={customerPricingContext ?? undefined}
            />
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && customer && (
        <OrderPreviewModal
          isOpen={showPreviewModal}
          customer={customer}
          deliveryDate={deliveryDate}
          warehouseLocation={warehouseLocation}
          deliveryTimeWindow={deliveryTimeWindow}
          poNumber={poNumber}
          specialInstructions={specialInstructions}
          items={orderItems}
          total={orderTotal}
          requiresApproval={false}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowPreviewModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
