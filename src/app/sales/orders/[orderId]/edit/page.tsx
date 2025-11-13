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
import { ORDER_USAGE_OPTIONS, ORDER_USAGE_LABELS, type OrderUsageCode } from '@/constants/orderUsage';
import { DELIVERY_METHOD_OPTIONS } from '@/constants/deliveryMethods';
import { formatDeliveryWindows, type DeliveryWindow } from '@/lib/delivery-window';
import {
  OrderAccordionSection,
  OrderActionFooter,
  type OrderSectionKey,
  type OrderAccordionStatus,
} from '@/components/orders/OrderFormLayout';

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
  deliveryInstructions: string | null;
  deliveryWindows: DeliveryWindow[];
  deliveryMethod: string | null;
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
  usageType: OrderUsageCode | null;
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
  const [deliveryMethod, setDeliveryMethod] = useState<string>(DELIVERY_METHOD_OPTIONS[0]);
  const [poNumber, setPoNumber] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [splitCaseFee, setSplitCaseFee] = useState<number>(0);
  const [openSections, setOpenSections] = useState<Record<OrderSectionKey, boolean>>({
    customer: true,
    delivery: true,
    products: true,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [salesRepDeliveryDays, setSalesRepDeliveryDays] = useState<string[]>([]);
  const toggleSection = useCallback((section: OrderSectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);
  const handleUsageSelect = useCallback((rowIndex: number, value: OrderUsageCode) => {
    setOrderItems(prev => {
      const next = [...prev];
      const current = next[rowIndex];
      if (!current) {
        return prev;
      }
      const nextUsage = current.usageType === value ? null : value;
      next[rowIndex] = {
        ...current,
        usageType: nextUsage,
      };
      return next;
    });
  }, []);

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
          deliveryInstructions: order.customer.deliveryInstructions ?? null,
          deliveryWindows: Array.isArray(order.customer.deliveryWindows) ? order.customer.deliveryWindows : [],
          deliveryMethod: order.customer.deliveryMethod ?? null,
        });

        setDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : '');
        setWarehouseLocation(order.warehouseLocation || 'main');
        setDeliveryTimeWindow(order.deliveryTimeWindow || 'anytime');
        setDeliveryMethod(order.shippingMethod || data.customer.deliveryMethod || DELIVERY_METHOD_OPTIONS[0]);
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
          usageType: line.usageType ?? null,
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
    const quantity = Math.max(0, quantityFromGrid);

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
      usageType: null,
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
      const actualQuantity = Math.max(0, quantity);

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
        usageType: null,
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
  const customerPreferredWindows = useMemo(
    () => formatDeliveryWindows(customer?.deliveryWindows ?? []),
    [customer?.deliveryWindows]
  );

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return !!(
      customer &&
      deliveryDate &&
      warehouseLocation &&
      deliveryMethod &&
      orderItems.length > 0 &&
      orderItems.every(item => item.quantity > 0)
    );
  }, [customer, deliveryDate, warehouseLocation, deliveryMethod, orderItems]);
  const sectionStatuses = useMemo<Record<OrderSectionKey, OrderAccordionStatus>>(() => {
    const productsReady = orderItems.length > 0 && orderItems.every((item) => item.quantity > 0);
    return {
      customer: customer
        ? { tone: 'success', label: 'Locked' }
        : { tone: 'warning', label: 'Missing' },
      delivery:
        deliveryDate && warehouseLocation
          ? { tone: 'success', label: 'Scheduled' }
          : { tone: 'warning', label: 'Add details' },
      products: productsReady
        ? { tone: 'success', label: `${orderItems.length} items` }
        : {
            tone: orderItems.length === 0 ? 'danger' : 'warning',
            label: orderItems.length === 0 ? 'Add products' : 'Check quantities',
          },
    };
  }, [customer, deliveryDate, warehouseLocation, orderItems]);

  const outstandingIssues = useMemo(() => {
    let issues = 0;
    if (!deliveryDate) issues += 1;
    if (!warehouseLocation) issues += 1;
    if (!orderItems.length) issues += 1;
    if (orderItems.some((item) => item.quantity <= 0)) issues += 1;
    return issues;
  }, [deliveryDate, warehouseLocation, orderItems]);

  const estimatedTotal = orderTotal + deliveryFee + splitCaseFee;
  const primaryActionLabel = 'Review Changes';
  const actionLoadingText = 'Updating order...';
  const issueMessage =
    outstandingIssues > 0 ? 'Resolve outstanding fields to continue' : 'Changes ready to review';

  // Show preview modal before submission
  const handleShowPreview = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      const hasZeroQuantity = orderItems.some(item => item.quantity <= 0);
      showError(
        'Validation error',
        hasZeroQuantity ? 'All products must have a quantity greater than zero' : 'Please complete all required fields'
      );
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
          deliveryMethod,
          poNumber: poNumber.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
          items: orderItems.map(item => ({
            skuId: item.skuId,
            quantity: item.quantity,
            ...(item.usageType ? { usageType: item.usageType } : {}),
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
  }, [orderId, deliveryDate, warehouseLocation, deliveryTimeWindow, deliveryMethod, poNumber, specialInstructions, orderItems, router]);

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
  <main className="layout-shell-tight layout-stack pb-12">
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
        <form onSubmit={handleShowPreview} className="relative space-y-6 pb-48">
          {/* Section 1: Customer Information (LOCKED) */}
          <OrderAccordionSection
            id="customer"
            title="Customer Information"
            description="Locked when editing an existing order"
            status={sectionStatuses.customer}
            isOpen={openSections.customer}
            onToggle={() => toggleSection('customer')}
          >
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-600">Customer Name</p>
                <p className="font-medium text-gray-900">{customer.name}</p>
              </div>
              {customer.accountNumber && (
                <div>
                  <p className="text-gray-600">Account Number</p>
                  <p className="font-medium text-gray-900">{customer.accountNumber}</p>
                </div>
              )}
              <p className="mt-3 text-xs text-gray-500">
                🔒 Customer cannot be changed when editing an existing order
              </p>
            </div>
          </OrderAccordionSection>

          {/* Section 2: Delivery Settings */}
          <OrderAccordionSection
            id="delivery"
            title="Delivery Settings"
            description="Schedule, warehouses, and delivery context"
            status={sectionStatuses.delivery}
            isOpen={openSections.delivery}
            onToggle={() => toggleSection('delivery')}
          >
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
                <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-700">
                  Delivery Method
                </label>
                <select
                  id="deliveryMethod"
                  value={deliveryMethod}
                  onChange={(event) => setDeliveryMethod(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
                >
                  {DELIVERY_METHOD_OPTIONS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
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
          </OrderAccordionSection>

          {/* Section 3: Products */}
          <OrderAccordionSection
            id="products"
            title="Products"
            description="Adjust quantities, usage, and pricing"
            status={sectionStatuses.products}
            isOpen={openSections.products}
            onToggle={() => toggleSection('products')}
          >
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
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Usage <span className="font-normal lowercase text-gray-400">(optional)</span>
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
                          {item.inventoryStatus ? (
                            <div className="mt-2 text-xs text-gray-500">
                              <div
                                className={`font-medium ${
                                  item.inventoryStatus.sufficient ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {item.inventoryStatus.available} available
                              </div>
                              <div>
                                {item.inventoryStatus.onHand} on hand • {item.inventoryStatus.allocated} allocated
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-gray-400">Inventory info unavailable</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              {ORDER_USAGE_OPTIONS.map(option => {
                                const isActive = item.usageType === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleUsageSelect(index, option.value)}
                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                      isActive
                                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                                        : 'border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400 hover:bg-gray-200'
                                    }`}
                                    title={option.helper}
                                    aria-pressed={isActive}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-xs text-gray-500">
                              {item.usageType ? ORDER_USAGE_LABELS[item.usageType] : 'Leave blank for standard sales'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={item.quantity}
                            onChange={(e) => {
                              const parsedQty = parseInt(e.target.value, 10);
                              const safeQty = Number.isNaN(parsedQty) ? 0 : Math.max(parsedQty, 0);
                              const pricing = resolvePriceForQuantity(
                                item.priceLists,
                                Math.max(safeQty, 1),
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
                                quantity: safeQty,
                                unitPrice: resolvedUnitPrice,
                                lineTotal: safeQty * resolvedUnitPrice,
                                pricing: effectivePricing,
                              };
                              setOrderItems(newItems);
                            }}
                            min="0"
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
          </OrderAccordionSection>

          <OrderActionFooter
            total={estimatedTotal}
            requiresApproval={false}
            issuesCount={outstandingIssues}
            isFormValid={isFormValid}
            submitting={submitting}
            primaryLabel={primaryActionLabel}
            loadingText={actionLoadingText}
            issueMessage={issueMessage}
            cancelHref={`/sales/orders/${orderId}`}
          />
        </form>

        {/* Sidebar Column */}
        <OrderSummarySidebar
          customer={customer}
          deliveryDate={deliveryDate}
          warehouseLocation={warehouseLocation}
          deliveryTimeWindow={deliveryTimeWindow}
          deliveryMethod={deliveryMethod}
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
          deliveryMethod={deliveryMethod}
          poNumber={poNumber}
          specialInstructions={specialInstructions}
          customerDeliveryInstructions={customer.deliveryInstructions}
          customerDeliveryWindows={customerPreferredWindows}
          items={orderItems}
          total={orderTotal}
          requiresApproval={false}
          statusSelectionEnabled={false}
          confirmLabel="Update Order"
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowPreviewModal(false)}
          submitting={submitting}
        />
      )}
    </main>
  );
}
