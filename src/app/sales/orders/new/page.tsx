'use client';

/**
 * Direct Order Entry Page
 *
 * Replaces cart-based checkout with Travis's HAL workflow:
 * 1. Select customer (auto-fills defaults)
 * 2. Set delivery date with validation
 * 3. Choose warehouse location
 * 4. Add products with live inventory status
 * 5. Submit order (goes to PENDING or DRAFT if needs approval)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ProductGrid } from '@/components/orders/ProductGrid';
import { DeliveryDatePicker } from '@/components/orders/DeliveryDatePicker';
import { WarehouseSelector } from '@/components/orders/WarehouseSelector';
import { CustomerSearchCombobox } from '@/components/orders/CustomerSearchCombobox';
import { OrderSummarySidebar } from '@/components/orders/OrderSummarySidebar';
import { ValidationErrorSummary } from '@/components/orders/ValidationErrorSummary';
import { OrderSuccessModal } from '@/components/orders/OrderSuccessModal';
import { FormProgress } from '@/components/orders/FormProgress';
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

export default function NewOrderPage() {
  const router = useRouter();

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [warehouseLocation, setWarehouseLocation] = useState<string>('');
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const customerPricingContext = useMemo<CustomerPricingContext | null>(() => {
    if (!selectedCustomer) return null;
    return {
      state: selectedCustomer.state,
      territory: selectedCustomer.territory,
      accountNumber: selectedCustomer.accountNumber,
      name: selectedCustomer.name,
    };
  }, [selectedCustomer]);

  // UI state
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<{field: string; message: string; type: 'missing' | 'validation'}>>([]);
  const [salesRepDeliveryDays, setSalesRepDeliveryDays] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<{orderId: string; orderNumber: string; total: number; requiresApproval: boolean} | null>(null);

  // Load sales rep delivery days
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/sales/profile');
        if (response.ok) {
          const profileData = await response.json();
          setSalesRepDeliveryDays(profileData.salesRep?.deliveryDaysArray || []);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }
    void loadProfile();
  }, []);

  // Auto-fill defaults when customer selected
  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomer(customer);
    setWarehouseLocation(customer.defaultWarehouseLocation || 'main');
    setDeliveryTimeWindow(customer.defaultDeliveryTimeWindow || 'anytime');
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

    // Show success toast
    toast.success(`Added ${quantity}x ${product.productName} to order`, {
      description: `$${(quantity * unitPrice).toFixed(2)} total`,
      duration: 3000,
    });
  }, []);

  // Calculate order total
  const orderTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const requiresApproval = orderItems.some(item =>
    (item.inventoryStatus && !item.inventoryStatus.sufficient) || item.pricing.overrideApplied
  );

  // Validate form
  const validateForm = useCallback(() => {
    const errors: Array<{field: string; message: string; type: 'missing' | 'validation'}> = [];

    if (!selectedCustomer) {
      errors.push({ field: 'Customer', message: 'Please select a customer', type: 'missing' });
    }
    if (!deliveryDate) {
      errors.push({ field: 'Delivery Date', message: 'Please select a delivery date', type: 'missing' });
    }
    if (!warehouseLocation) {
      errors.push({ field: 'Warehouse', message: 'Please select a warehouse location', type: 'missing' });
    }
    if (selectedCustomer?.requiresPO && !poNumber.trim()) {
      errors.push({ field: 'PO Number', message: 'PO number is required for this customer', type: 'validation' });
    }
    if (orderItems.length === 0) {
      errors.push({ field: 'Products', message: 'Please add at least one product to the order', type: 'missing' });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [selectedCustomer, deliveryDate, warehouseLocation, poNumber, orderItems]);

  // Submit order
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors below');
      // Smooth scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.error('Please complete all required fields', {
        description: 'Review the error messages at the top of the form',
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    setValidationErrors([]);

    try {
      const response = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
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
        throw new Error(data.error || 'Failed to create order');
      }

      const result = await response.json();

      // Show success modal instead of immediate redirect
      setCreatedOrderData({
        orderId: result.orderId,
        orderNumber: result.orderId.slice(0, 8).toUpperCase(),
        total: orderTotal,
        requiresApproval: result.requiresApproval || false,
      });
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }, [selectedCustomer, deliveryDate, warehouseLocation, deliveryTimeWindow, poNumber, specialInstructions, orderItems, orderTotal, validateForm]);

  // Calculate form progress
  const formSteps = useMemo(() => [
    { number: 1, label: 'Customer', complete: !!selectedCustomer },
    { number: 2, label: 'Products', complete: orderItems.length > 0 },
    { number: 3, label: 'Delivery', complete: !!deliveryDate && !!warehouseLocation },
  ], [selectedCustomer, orderItems.length, deliveryDate, warehouseLocation]);

  const currentStep = !selectedCustomer ? 1 : orderItems.length === 0 ? 2 : 3;

  // Calculate inventory issues for validation summary
  const inventoryIssues = useMemo(() => {
    return orderItems
      .filter(item => item.inventoryStatus && !item.inventoryStatus.sufficient)
      .map(item => ({
        productName: item.productName,
        skuCode: item.skuCode,
        requested: item.quantity,
        available: item.inventoryStatus?.available || 0,
        shortfall: (item.inventoryStatus?.available || 0) < item.quantity
          ? item.quantity - (item.inventoryStatus?.available || 0)
          : 0,
      }));
  }, [orderItems]);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
          <p className="mt-1 text-sm text-gray-600">
            Direct order entry - no cart required
          </p>
        </div>
        <Link
          href="/sales/orders"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
        >
          Cancel
        </Link>
      </header>

      {/* Progress Indicator */}
      <FormProgress steps={formSteps} currentStep={currentStep} />

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6">
          <ValidationErrorSummary
            errors={validationErrors}
            inventoryIssues={inventoryIssues}
            onDismiss={() => {
              setValidationErrors([]);
              setError(null);
            }}
          />
        </div>
      )}

      {requiresApproval && validationErrors.length === 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">⚠ Manager Approval Required</p>
          <p className="mt-1 text-sm text-amber-700">
            This order includes low inventory items or manual pricing overrides and will require manager review before processing.
          </p>
        </div>
      )}

      {/* 2-Column Layout: Form + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Form Column */}
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Customer Selection */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Customer Information</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                Customer <span className="text-rose-600">*</span>
              </label>
              <CustomerSearchCombobox
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                error={error && !selectedCustomerId ? 'Please select a customer' : undefined}
              />
            </div>
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
                Delivery Time Window <span className="text-xs font-normal text-gray-500">(Optional)</span>
                <span className="ml-1 cursor-help text-gray-400" title="Preferred time window for delivery. Leave as 'Anytime' if no preference.">ⓘ</span>
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
                PO Number {selectedCustomer?.requiresPO ? <span className="text-rose-600">*</span> : <span className="text-xs font-normal text-gray-500">(Optional)</span>}
              </label>
              <input
                id="poNumber"
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Customer PO number"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
                required={selectedCustomer?.requiresPO}
              />
              {selectedCustomer?.requiresPO && (
                <p className="mt-1 text-xs text-gray-600">This customer requires a PO number for all orders</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">
                Special Instructions <span className="text-xs font-normal text-gray-500">(Optional)</span>
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
            <button
              type="button"
              onClick={() => setShowProductSelector(true)}
              disabled={!selectedCustomer || !warehouseLocation}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Products
            </button>
          </div>

          {orderItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-600">
                No products added yet. Click "Add Products" to start building the order.
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
                      Inventory
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
                        {item.brand && <div className="text-xs text-gray-500">{item.brand}</div>}
                        <div
                          className={`text-xs ${
                            item.pricing.priceList
                              ? item.pricing.overrideApplied
                                ? 'text-amber-700'
                                : 'text-gray-500'
                              : 'text-rose-700'
                          }`}
                        >
                          {item.pricing.priceList
                            ? describePriceListForDisplay(item.pricing.priceList)
                            : 'No price list match'}
                          {item.pricing.overrideApplied && item.pricing.priceList ? ' • manual review' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.inventoryStatus ? (
                          <div className="text-xs">
                            <div className={`font-medium ${
                              item.inventoryStatus.sufficient ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {item.inventoryStatus.available} available
                            </div>
                            <div className="text-gray-500">
                              {item.inventoryStatus.onHand} on hand • {item.inventoryStatus.allocated} allocated
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
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

        {/* Section 4: Order Summary */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">${orderTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-500">Calculated at invoice</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">${orderTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>Items: {orderItems.length}</p>
              <p>Delivery: {deliveryDate ? new Date(deliveryDate).toLocaleDateString() : 'Not set'}</p>
              <p>Warehouse: {warehouseLocation || 'Not selected'}</p>
            </div>
          </div>
        </section>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/sales/orders"
              className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating Order...' : requiresApproval ? 'Submit for Approval' : 'Create Order'}
            </button>
          </div>
        </form>

        {/* Sidebar Column */}
        <OrderSummarySidebar
          customer={selectedCustomer}
          deliveryDate={deliveryDate}
          warehouseLocation={warehouseLocation}
          deliveryTimeWindow={deliveryTimeWindow}
          poNumber={poNumber}
          items={orderItems}
          onRemoveItem={(skuId) => {
            setOrderItems(orderItems.filter(item => item.skuId !== skuId));
          }}
          requiresApproval={requiresApproval}
        />
      </div>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Products to Order</h3>
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
              existingSkuIds={orderItems.map(item => item.skuId)}
              customer={customerPricingContext ?? undefined}
            />
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && createdOrderData && (
        <OrderSuccessModal
          isOpen={showSuccessModal}
          orderId={createdOrderData.orderId}
          orderNumber={createdOrderData.orderNumber}
          total={createdOrderData.total}
          requiresApproval={createdOrderData.requiresApproval}
          customerName={selectedCustomer?.name || ''}
          deliveryDate={deliveryDate}
          onClose={() => {
            setShowSuccessModal(false);
            router.push(`/sales/orders/${createdOrderData.orderId}`);
          }}
          onCreateAnother={() => {
            setShowSuccessModal(false);
            // Reset form
            setSelectedCustomerId('');
            setSelectedCustomer(null);
            setDeliveryDate('');
            setWarehouseLocation('');
            setDeliveryTimeWindow('');
            setPoNumber('');
            setSpecialInstructions('');
            setOrderItems([]);
            setCreatedOrderData(null);
          }}
        />
      )}
    </div>
  );
}
