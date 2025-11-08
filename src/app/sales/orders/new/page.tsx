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

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { showError, showInfo, notifications } from '@/lib/toast-helpers';
import { ButtonWithLoading } from '@/components/ui/button-variants';
import { ProductGrid } from '@/components/orders/ProductGrid';
import { DeliveryDatePicker } from '@/components/orders/DeliveryDatePicker';
import { WarehouseSelector } from '@/components/orders/WarehouseSelector';
import { CustomerSearchCombobox } from '@/components/orders/CustomerSearchCombobox';
import { OrderSummarySidebar } from '@/components/orders/OrderSummarySidebar';
import { ValidationErrorSummary } from '@/components/orders/ValidationErrorSummary';
import { OrderSuccessModal } from '@/components/orders/OrderSuccessModal';
import { OrderPreviewModal } from '@/components/orders/OrderPreviewModal';
import { FormProgress } from '@/components/orders/FormProgress';
import { resolvePriceForQuantity, PriceListSummary, PricingSelection, CustomerPricingContext, describePriceListForDisplay } from '@/components/orders/pricing-utils';
import { PriceOverride } from '@/components/orders/ProductGrid';
import { formatUTCDate } from '@/lib/dates';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { ORDER_USAGE_OPTIONS, ORDER_USAGE_LABELS, type OrderUsageCode } from '@/constants/orderUsage';
import { useRecentItems } from './hooks/useRecentItems';
import type { RecentPurchaseSuggestion } from '@/types/orders';

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
  salesRepId: string | null;
  salesRepName: string | null;
};

type InventoryStatus = {
  onHand: number;
  allocated: number;
  available: number;
  sufficient: boolean;
  warningLevel: 'none' | 'low' | 'critical';
};

type SalesRepOption = {
  id: string;
  name: string;
  territory: string | null;
  email: string | null;
  orderEntryEnabled?: boolean;
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
  priceOverride?: PriceOverride;
  usageType: OrderUsageCode | null;
};

type ProductSummary = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  size: string | null;
  pricePerUnit?: number;
  priceLists?: PriceListSummary[] | null;
};

function NewOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [warehouseLocation, setWarehouseLocation] = useState<string>('Warrenton');
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const orderSkuIds = useMemo(() => new Set(orderItems.map((item) => item.skuId)), [orderItems]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [splitCaseFee, setSplitCaseFee] = useState<number>(0);
  const [salesRepOptions, setSalesRepOptions] = useState<SalesRepOption[]>([]);
  const [salesRepOptionsLoading, setSalesRepOptionsLoading] = useState(true);
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string | null>(null);
  const [selectedSalesRepName, setSelectedSalesRepName] = useState<string | null>(null);
  const [customerDefaultSalesRepId, setCustomerDefaultSalesRepId] = useState<string | null>(null);
  const [customerDefaultSalesRepName, setCustomerDefaultSalesRepName] = useState<string | null>(null);
  const [loggedInSalesRepId, setLoggedInSalesRepId] = useState<string | null>(null);
  const [loggedInSalesRepName, setLoggedInSalesRepName] = useState<string | null>(null);

  const getSalesRepNameById = useCallback(
    (repId: string | null | undefined) => {
      if (!repId) return null;
      const match = salesRepOptions.find((rep) => rep.id === repId);
      return match?.name ?? null;
    },
    [salesRepOptions],
  );

  // Inline validation state (Phase 2)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const customerPricingContext = useMemo<CustomerPricingContext | null>(() => {
    if (!selectedCustomer) return null;
    return {
      state: selectedCustomer.state,
      territory: selectedCustomer.territory,
      accountNumber: selectedCustomer.accountNumber,
      name: selectedCustomer.name,
    };
  }, [selectedCustomer]);

  const {
    items: recentItems,
    loading: recentItemsLoading,
    error: recentItemsError,
  } = useRecentItems(selectedCustomerId || null);

  // UI state
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<{field: string; message: string; type: 'missing' | 'validation'}>>([]);
  const [salesRepDeliveryDays, setSalesRepDeliveryDays] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<{orderId: string; orderNumber: string; total: number; requiresApproval: boolean} | null>(null);
  const [canOverridePrices, setCanOverridePrices] = useState(false);
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

  // Load sales rep delivery days and permission checks
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/sales/profile');
        if (response.ok) {
          const profileData = await response.json();
          const deliveryDays = profileData.salesRep?.deliveryDaysArray || [];
          setSalesRepDeliveryDays(deliveryDays);
          setLoggedInSalesRepId(profileData.salesRep?.id ?? null);
          setLoggedInSalesRepName(profileData.user?.fullName ?? null);
          setSelectedSalesRepId((current) => current ?? profileData.salesRep?.id ?? current);
          setSelectedSalesRepName((current) => {
            if (current) return current;
            if (profileData.salesRep?.id) {
              return profileData.user?.fullName ?? current;
            }
            return current;
          });

          // Check if user can override prices (manager or admin)
          const roles: Array<{ role?: { code?: string | null } | null }> = profileData.user?.roles || [];
          const hasOverrideRole = roles.some((roleEntry) =>
            ['manager', 'admin', 'system_admin'].includes(roleEntry.role?.code ?? '')
          );
          setCanOverridePrices(hasOverrideRole);

          // PHASE 2: Smart Default - Pre-fill next delivery date
          if (deliveryDays.length > 0 && !deliveryDate) {
            const nextDate = getNextDeliveryDate(deliveryDays);
            if (nextDate) {
              setDeliveryDate(nextDate);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }
    void loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadSalesReps() {
      try {
        const response = await fetch('/api/sales/sales-reps/order-entry');
        if (!response.ok) {
          throw new Error('Failed to load sales reps');
        }
        const data = await response.json();
        setSalesRepOptions(data.salesReps ?? []);
      } catch (err) {
        console.error('Failed to load sales reps for order entry', err);
        setSalesRepOptions([]);
      } finally {
        setSalesRepOptionsLoading(false);
      }
    }
    void loadSalesReps();
  }, []);

  // Auto-fill defaults when customer selected
  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomer(customer);

    setCustomerDefaultSalesRepId(customer.salesRepId ?? null);
    setCustomerDefaultSalesRepName(customer.salesRepName ?? null);

    const fallbackRepId = customer.salesRepId ?? loggedInSalesRepId ?? null;
    setSelectedSalesRepId(fallbackRepId);
    const fallbackRepName =
      customer.salesRepName ??
      getSalesRepNameById(customer.salesRepId) ??
      (fallbackRepId === loggedInSalesRepId ? loggedInSalesRepName : null);
    setSelectedSalesRepName(fallbackRepName ?? null);

    // Smart warehouse default: customer default > last used > 'Warrenton'
    let defaultWarehouse = customer.defaultWarehouseLocation;
    if (!defaultWarehouse && typeof window !== 'undefined') {
      defaultWarehouse = localStorage.getItem('lastUsedWarehouse') || 'Warrenton';
    }
    setWarehouseLocation(defaultWarehouse || 'Warrenton');

    setDeliveryTimeWindow(customer.defaultDeliveryTimeWindow || 'anytime');

    // PHASE 2: Clear customer error when selected
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.customer;
      delete newErrors.salesRep;
      return newErrors;
    });
  }, [getSalesRepNameById, loggedInSalesRepId, loggedInSalesRepName]);

  // Preselect customer when arriving from deep links (e.g., Quick Actions)
  const prefillCustomerId = searchParams.get('customerId');
  useEffect(() => {
    if (!prefillCustomerId || selectedCustomerId) {
      return;
    }

    let cancelled = false;

    const preselectCustomer = async (customerId: string) => {
      try {
        const response = await fetch(`/api/sales/customers/${customerId}`);
        if (!response.ok) {
          console.warn('Unable to preselect customer:', await response.text());
          return;
        }

        const data = await response.json();
        if (cancelled || !data?.customer) {
          return;
        }

        const customerData: Customer = {
          id: data.customer.id,
          name: data.customer.name,
          territory: data.customer.territory ?? data.customer.salesRep?.territory ?? null,
          state: data.customer.address?.state ?? data.customer.state ?? null,
          accountNumber: data.customer.accountNumber ?? null,
          requiresPO: Boolean(data.customer.requiresPO),
          defaultWarehouseLocation: data.customer.defaultWarehouseLocation ?? null,
          defaultDeliveryTimeWindow: data.customer.defaultDeliveryTimeWindow ?? null,
          paymentTerms: data.customer.paymentTerms ?? null,
          salesRepId: data.customer.salesRepId ?? data.customer.salesRep?.id ?? null,
          salesRepName: data.customer.salesRep?.user?.fullName ?? null,
        };

        handleCustomerSelect(customerData);
      } catch (error) {
        console.error('Failed to preload customer for new order:', error);
      }
    };

    void preselectCustomer(prefillCustomerId);

    return () => {
      cancelled = true;
    };
  }, [prefillCustomerId, selectedCustomerId, handleCustomerSelect]);

  useEffect(() => {
    if (!selectedSalesRepId) return;
    const match = salesRepOptions.find((rep) => rep.id === selectedSalesRepId);
    if (match && match.name !== selectedSalesRepName) {
      setSelectedSalesRepName(match.name);
    }
  }, [salesRepOptions, selectedSalesRepId, selectedSalesRepName]);

  // Add product to order
  const handleAddProduct = useCallback(
    (
      product: ProductSummary,
      quantityFromGrid: number,
      inventoryStatus: InventoryStatus | undefined,
      pricing: PricingSelection,
      priceOverride?: PriceOverride,
    ) => {
    const baseUnitPrice = pricing.unitPrice || product.pricePerUnit || 0;
    const effectiveUnitPrice = priceOverride?.price ?? baseUnitPrice;
    const quantity = Math.max(0, quantityFromGrid);

    // PHASE 2: Quantity warning for unusual amounts
    const isUnusualQuantity = quantity >= 100; // Warn for very large orders
    const isLowInventory = inventoryStatus && !inventoryStatus.sufficient;
    const hasPriceOverride = !!priceOverride;

    const newItem: OrderItem = {
      skuId: product.skuId,
      skuCode: product.skuCode,
      productName: product.productName,
      brand: product.brand,
      size: product.size,
      quantity,
      unitPrice: effectiveUnitPrice,
      lineTotal: quantity * effectiveUnitPrice,
      inventoryStatus,
      pricing,
      priceLists: (product.priceLists as PriceListSummary[] | null) ?? [],
      priceOverride,
      usageType: null,
    };

    setOrderItems(prev => [...prev, newItem]);
    setShowProductSelector(false);

    // Clear products error when product added
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.products;
      return newErrors;
    });

    // Show success toast with warnings
    if (hasPriceOverride) {
      notifications.productAdded(product.productName, quantity, quantity * effectiveUnitPrice, 'Price override applied - Manager approval required');
    } else if (isUnusualQuantity) {
      notifications.productAdded(product.productName, quantity, quantity * effectiveUnitPrice, 'Large quantity - Manager approval may be required');
    } else if (isLowInventory) {
      notifications.productAdded(product.productName, quantity, quantity * effectiveUnitPrice, 'Low inventory - Manager approval required');
    } else {
      notifications.productAdded(product.productName, quantity, quantity * effectiveUnitPrice);
    }
    },
    [],
  );

  // Add multiple products at once (multi-select)
  const handleAddMultipleProducts = useCallback((products: Array<{
    product: ProductSummary;
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
        priceLists: (product.priceLists as PriceListSummary[] | null) ?? [],
        usageType: null,
      };
    });

    setOrderItems(prev => [...prev, ...newItems]);
    setShowProductSelector(false);

    // Clear products error when products added
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.products;
      return newErrors;
    });

    // Show success notification
    notifications.productAdded(
      `${newItems.length} products`,
      newItems.reduce((sum, item) => sum + item.quantity, 0),
      newItems.reduce((sum, item) => sum + item.lineTotal, 0),
      `Added ${newItems.length} products to order`
    );
  }, []);

  const buildOrderItemFromRecent = useCallback((recent: RecentPurchaseSuggestion): OrderItem => {
    const quantity = Math.max(1, recent.lastQuantity);
    const priceLists = recent.priceLists ?? [];
    const pricing = resolvePriceForQuantity(priceLists, quantity, customerPricingContext ?? undefined);
    const shouldApplyOverride = !recent.priceMatchesStandard && recent.lastUnitPrice > 0;
    const unitPrice = shouldApplyOverride ? recent.lastUnitPrice : pricing.unitPrice;
    const reason =
      recent.overrideReason ??
      `Previous negotiated price from ${formatShortDate(recent.lastOrderedAt)} order ${
        recent.lastOrderNumber ?? recent.lastOrderId.slice(0, 8).toUpperCase()
      }`;

    return {
      skuId: recent.skuId,
      skuCode: recent.skuCode,
      productName: recent.productName,
      brand: recent.brand,
      size: recent.size,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
      inventoryStatus: null,
      pricing,
      priceLists,
      priceOverride: shouldApplyOverride
        ? {
            price: recent.lastUnitPrice,
            reason,
          }
        : undefined,
      usageType: null,
    };
  }, [customerPricingContext]);

  const handleAddRecentItem = useCallback((recent: RecentPurchaseSuggestion) => {
    let addedItem: OrderItem | null = null;
    setOrderItems((current) => {
      if (current.some((item) => item.skuId === recent.skuId)) {
        showInfo('Product already added', `${recent.productName} is already in this order.`);
        return current;
      }
      const nextItem = buildOrderItemFromRecent(recent);
      addedItem = nextItem;
      return [...current, nextItem];
    });

    if (addedItem) {
      setFieldErrors((prev) => {
        if (!prev.products) return prev;
        const next = { ...prev };
        delete next.products;
        return next;
      });
      notifications.productAdded(
        addedItem.productName,
        addedItem.quantity,
        addedItem.lineTotal,
        recent.priceMatchesStandard ? undefined : 'Using customer-specific pricing from their last order',
      );
    }
  }, [buildOrderItemFromRecent, setFieldErrors]);

  const handleAddAllRecentItems = useCallback(() => {
    if (recentItems.length === 0) {
      showInfo('No recent items available', 'This customer has not ordered in the last six months.');
      return;
    }

    let addedCount = 0;
    let totalQuantity = 0;
    let totalValue = 0;

    setOrderItems((current) => {
      const existing = new Set(current.map((item) => item.skuId));
      const additions: OrderItem[] = [];

      recentItems.forEach((recent) => {
        if (existing.has(recent.skuId)) {
          return;
        }
        const nextItem = buildOrderItemFromRecent(recent);
        additions.push(nextItem);
        existing.add(recent.skuId);
        addedCount += 1;
        totalQuantity += nextItem.quantity;
        totalValue += nextItem.lineTotal;
      });

      if (additions.length === 0) {
        showInfo('No recent items added', 'All suggested products are already part of this order.');
        return current;
      }

      return [...current, ...additions];
    });

    if (addedCount > 0) {
      setFieldErrors((prev) => {
        if (!prev.products) return prev;
        const next = { ...prev };
        delete next.products;
        return next;
      });
      notifications.productAdded(
        `${addedCount} recent items`,
        totalQuantity,
        totalValue,
        'Loaded from purchase history',
      );
    }
  }, [recentItems, buildOrderItemFromRecent, setFieldErrors]);

  // Calculate order total
  const orderTotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const requiresApproval = orderItems.some(item =>
    (item.inventoryStatus && !item.inventoryStatus.sufficient) ||
    item.pricing.overrideApplied ||
    !!item.priceOverride
  );

  // Check if form is valid for submit button
  const isFormValid = useMemo(() => {
    return !!(
      selectedCustomer &&
      deliveryDate &&
      warehouseLocation &&
      selectedSalesRepId &&
      orderItems.length > 0 &&
      orderItems.every(item => item.quantity > 0) &&
      (!selectedCustomer.requiresPO || poNumber.trim())
    );
  }, [selectedCustomer, deliveryDate, warehouseLocation, orderItems, poNumber, selectedSalesRepId]);

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
    } else if (orderItems.some(item => item.quantity <= 0)) {
      errors.push({ field: 'Products', message: 'Enter a quantity greater than zero for each product', type: 'validation' });
    }
    if (!selectedSalesRepId) {
      errors.push({ field: 'Salesperson', message: 'Select the salesperson who should receive credit', type: 'missing' });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [selectedCustomer, deliveryDate, warehouseLocation, poNumber, orderItems, selectedSalesRepId]);

  // PHASE 2: Show preview modal before submission
  const handleShowPreview = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors below');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      notifications.validationError('Please complete all required fields', 'Review the error messages at the top of the form');
      return;
    }

    // Show preview modal
    setShowPreviewModal(true);
  }, [validateForm]);

  // Submit order (called from preview modal)
  const handleConfirmSubmit = useCallback(async () => {
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
            salesRepId: selectedSalesRepId ?? undefined,
            items: orderItems.map(item => ({
              skuId: item.skuId,
              quantity: item.quantity,
              ...(item.usageType ? { usageType: item.usageType } : {}),
            ...(item.priceOverride && {
              priceOverride: {
                price: item.priceOverride.price,
                reason: item.priceOverride.reason,
              }
            }),
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
        orderNumber: result.orderNumber || result.orderId.slice(0, 8).toUpperCase(),
        total: orderTotal,
        requiresApproval: result.requiresApproval || false,
      });
      setShowSuccessModal(true);
      setShowPreviewModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      setShowPreviewModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showError('Order creation failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }, [selectedCustomer, deliveryDate, warehouseLocation, deliveryTimeWindow, poNumber, specialInstructions, orderItems, orderTotal, selectedSalesRepId]);

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

  const combinedSalesRepOptions = useMemo(() => {
    const map = new Map<string, SalesRepOption>();
    salesRepOptions.forEach((rep) => map.set(rep.id, rep));
    if (selectedSalesRepId && !map.has(selectedSalesRepId)) {
      map.set(selectedSalesRepId, {
        id: selectedSalesRepId,
        name: selectedSalesRepName ?? customerDefaultSalesRepName ?? loggedInSalesRepName ?? 'Assigned Salesperson',
        territory: null,
        email: null,
        orderEntryEnabled: false,
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const aKey = a.name.split(/\s+/)[0]?.toLowerCase() ?? a.name.toLowerCase();
      const bKey = b.name.split(/\s+/)[0]?.toLowerCase() ?? b.name.toLowerCase();
      if (aKey === bKey) {
        return a.name.localeCompare(b.name);
      }
      return aKey.localeCompare(bKey);
    });
  }, [
    salesRepOptions,
    selectedSalesRepId,
    selectedSalesRepName,
    customerDefaultSalesRepName,
    loggedInSalesRepName,
  ]);

  const isSalesRepOverride = useMemo(() => {
    if (!selectedSalesRepId) return false;
    if (!customerDefaultSalesRepId) return false;
    return selectedSalesRepId !== customerDefaultSalesRepId;
  }, [selectedSalesRepId, customerDefaultSalesRepId]);

  // PHASE 2: Helper function to get next delivery date
  function getNextDeliveryDate(deliveryDays: string[]): string | null {
    if (deliveryDays.length === 0) return null;

    const today = new Date();
    const currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    // Look ahead 14 days to find next delivery day
    for (let i = 0; i < 14; i++) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      if (deliveryDays.includes(dayName)) {
        return formatUTCDate(currentDate);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return null;
  }

  // PHASE 2: Inline validation for individual fields
  const validateField = useCallback((field: string, value: unknown) => {
    const errors: Record<string, string> = {};

    switch (field) {
      case 'customer':
        if (!value) {
          errors.customer = 'Please select a customer';
        }
        break;
      case 'deliveryDate':
        if (!value) {
          errors.deliveryDate = 'Please select a delivery date';
        }
        break;
      case 'warehouse':
        if (!value) {
          errors.warehouse = 'Please select a warehouse location';
        }
        break;
      case 'poNumber':
        if (selectedCustomer?.requiresPO && !value?.trim()) {
          errors.poNumber = 'PO number is required for this customer';
        }
        break;
      case 'products':
        if (orderItems.length === 0) {
          errors.products = 'Please add at least one product';
        }
        break;
      case 'salesRep':
        if (!selectedSalesRepId) {
          errors.salesRep = 'Select a salesperson';
        }
        break;
    }

    setFieldErrors(prev => {
      const newErrors = { ...prev };
      if (errors[field]) {
        newErrors[field] = errors[field];
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  }, [selectedCustomer, orderItems.length, selectedSalesRepId]);

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

      {error && (
        <div className="mb-6 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

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
        <form onSubmit={handleShowPreview} className="space-y-6">
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
                error={fieldErrors.customer}
              />
              {fieldErrors.customer && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.customer}</p>
              )}
            </div>
            <div>
              <label htmlFor="salesRep" className="block text-sm font-medium text-gray-700 mb-1">
                Salesperson <span className="text-rose-600">*</span>
              </label>
              <select
                id="salesRep"
                value={selectedSalesRepId ?? ''}
                onChange={(e) => {
                  const nextId = e.target.value || null;
                  setSelectedSalesRepId(nextId);
                  const derivedName =
                    getSalesRepNameById(nextId) ??
                    (nextId === customerDefaultSalesRepId ? customerDefaultSalesRepName : null) ??
                    (nextId === loggedInSalesRepId ? loggedInSalesRepName : null);
                  setSelectedSalesRepName(derivedName ?? null);
                  validateField('salesRep', nextId);
                }}
                onBlur={(e) => validateField('salesRep', e.target.value)}
                disabled={salesRepOptionsLoading && !selectedSalesRepId}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.salesRep
                    ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-gray-300 focus:border-gray-500 focus:ring-gray-200'
                } ${salesRepOptionsLoading && !selectedSalesRepId ? 'bg-gray-50 text-gray-500' : ''}`}
              >
                <option value="" disabled>
                  {salesRepOptionsLoading && !selectedSalesRepId
                    ? 'Loading sales reps...'
                    : 'Select salesperson'}
                </option>
                {combinedSalesRepOptions.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                    {rep.orderEntryEnabled === false ? ' (not order-entry enabled)' : ''}
                  </option>
                ))}
              </select>
              {isSalesRepOverride && customerDefaultSalesRepName && (
                <p className="mt-1 text-xs text-amber-700">
                  Reassigned from {customerDefaultSalesRepName}. Make sure commissions are updated accordingly.
                </p>
              )}
              {!selectedSalesRepId && (
                <p className="mt-1 text-xs text-gray-500">
                  Defaulted to the salesperson on the customer record. Override if another rep should receive credit.
                </p>
              )}
              {fieldErrors.salesRep && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.salesRep}</p>
              )}
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
                {deliveryDate && salesRepDeliveryDays.length > 0 && (
                  <span className="ml-2 text-xs text-emerald-600 font-normal">
                    ✓ Auto-selected next delivery day
                  </span>
                )}
              </label>
              <DeliveryDatePicker
                value={deliveryDate}
                onChange={(date) => {
                  setDeliveryDate(date);
                  validateField('deliveryDate', date);
                }}
                deliveryDays={salesRepDeliveryDays}
                error={fieldErrors.deliveryDate}
              />
              {fieldErrors.deliveryDate && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.deliveryDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700">
                Warehouse Location <span className="text-rose-600">*</span>
              </label>
              <WarehouseSelector
                value={warehouseLocation}
                onChange={(warehouse) => {
                  setWarehouseLocation(warehouse);
                  validateField('warehouse', warehouse);
                  // Remember warehouse selection for next order
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('lastUsedWarehouse', warehouse);
                  }
                }}
              />
              {fieldErrors.warehouse && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.warehouse}</p>
              )}
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
                onBlur={(e) => validateField('poNumber', e.target.value)}
                placeholder="Customer PO number"
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
                  fieldErrors.poNumber
                    ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-gray-300 focus:border-gray-500 focus:ring-gray-200'
                }`}
                required={selectedCustomer?.requiresPO}
              />
              {selectedCustomer?.requiresPO && !fieldErrors.poNumber && (
                <p className="mt-1 text-xs text-gray-600">This customer requires a PO number for all orders</p>
              )}
              {fieldErrors.poNumber && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.poNumber}</p>
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

        {/* Section: Recent Purchases */}
        {selectedCustomer && (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Purchases</h2>
                <p className="text-sm text-gray-600">
                  Items this customer has ordered in the last six months. Add them with one click and we&apos;ll reuse the
                  pricing from their most recent order.
                </p>
              </div>
              {recentItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllRecentItems}
                  className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={recentItemsLoading}
                >
                  Add All Recent Items
                </button>
              )}
            </div>

            <div className="mt-4">
              {recentItemsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-lg border border-slate-100 p-4">
                      <div className="h-4 w-1/3 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
                    </div>
                  ))}
                </div>
              ) : recentItemsError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {recentItemsError}
                </div>
              ) : recentItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-gray-600">
                  No purchases in the last six months. Use the catalog below to build this order.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Product</th>
                        <th className="px-4 py-3 text-left">Last Order</th>
                        <th className="px-4 py-3 text-left">Last Price</th>
                        <th className="px-4 py-3 text-left">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {recentItems.map((item) => {
                        const alreadyAdded = orderSkuIds.has(item.skuId);
                        return (
                          <tr key={item.skuId}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{item.productName}</div>
                              <div className="text-xs text-gray-500">{item.skuCode}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                Last quantity: {item.lastQuantity} • {item.timesOrdered} orders
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">{formatShortDate(item.lastOrderedAt)}</div>
                              <div className="text-xs text-gray-500">
                                Order {item.lastOrderNumber ?? item.lastOrderId.slice(0, 8).toUpperCase()}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-gray-900">
                                {formatCurrency(item.lastUnitPrice, 'USD')}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                                    item.priceMatchesStandard
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {item.priceMatchesStandard ? 'Standard price' : 'Customer price'}
                                </span>
                                {item.standardPrice && !item.priceMatchesStandard && (
                                  <span className="text-gray-500">
                                    Std {formatCurrency(item.standardPrice, 'USD')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleAddRecentItem(item)}
                                disabled={alreadyAdded}
                                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {alreadyAdded ? 'Added' : 'Add'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 3: Products */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Products</h2>
            <ButtonWithLoading
              type="button"
              onClick={() => setShowProductSelector(true)}
              disabled={!selectedCustomer || !warehouseLocation}
              variant="primary"
            >
              Add Products{orderItems.length > 0 && ` (${orderItems.length})`}
            </ButtonWithLoading>
          </div>

          {orderItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-600">
                No products added yet. Use the Add Products button to start building the order.
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
                        {item.brand && <div className="text-xs text-gray-500">{item.brand}</div>}
                        <div
                          className={`text-xs ${
                            item.priceOverride
                              ? 'text-blue-700'
                              : item.pricing.priceList
                              ? item.pricing.overrideApplied
                                ? 'text-amber-700'
                                : 'text-gray-500'
                              : 'text-rose-700'
                          }`}
                        >
                          {item.priceOverride ? (
                            <>
                              Manual Price Override
                              <div className="text-xs text-gray-600 mt-0.5">
                                {item.priceOverride.reason}
                              </div>
                            </>
                          ) : item.pricing.priceList ? (
                            <>
                              {describePriceListForDisplay(item.pricing.priceList)}
                              {item.pricing.overrideApplied && item.pricing.priceList ? ' • manual review' : ''}
                            </>
                          ) : (
                            'No price list match'
                          )}
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
                      <td className="px-4 py-3 text-right">
                        {item.priceOverride ? (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-700">
                              ${item.unitPrice.toFixed(2)}
                            </div>
                            <div className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 mt-1">
                              Override Applied
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900">
                            ${item.unitPrice.toFixed(2)}
                          </div>
                        )}
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
              href="/sales/orders"
              className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Cancel
            </Link>
            <ButtonWithLoading
              type="submit"
              loading={submitting}
              loadingText="Creating Order..."
              variant="primary"
              size="lg"
              disabled={!isFormValid || submitting}
            >
              {requiresApproval ? 'Submit for Approval' : 'Create Order'}
            </ButtonWithLoading>
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
              onAddMultipleProducts={handleAddMultipleProducts}
              existingSkuIds={orderItems.map(item => item.skuId)}
              customer={customerPricingContext ?? undefined}
              canOverridePrices={canOverridePrices}
            />
          </div>
        </div>
      )}

      {/* PHASE 2: Order Preview Modal */}
      {showPreviewModal && selectedCustomer && (
        <OrderPreviewModal
          isOpen={showPreviewModal}
          customer={selectedCustomer}
          deliveryDate={deliveryDate}
          warehouseLocation={warehouseLocation}
          deliveryTimeWindow={deliveryTimeWindow}
          poNumber={poNumber}
          specialInstructions={specialInstructions}
          items={orderItems}
          total={orderTotal}
          requiresApproval={requiresApproval}
          salesRepName={
            selectedSalesRepName ??
            customerDefaultSalesRepName ??
            loggedInSalesRepName ??
            null
          }
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowPreviewModal(false)}
          submitting={submitting}
        />
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
            setDeliveryFee(0);
            setSplitCaseFee(0);
            setCustomerDefaultSalesRepId(null);
            setCustomerDefaultSalesRepName(null);
            setSelectedSalesRepId(loggedInSalesRepId ?? null);
            setSelectedSalesRepName(loggedInSalesRepName ?? null);
            setFieldErrors({});
            setValidationErrors([]);
          }}
        />
      )}
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Loading order form...</h2>
            <p className="mt-2 text-sm text-gray-600">
              Preparing customer data and pricing context. Please hold on a moment.
            </p>
          </section>
        </main>
      }
    >
      <NewOrderPageContent />
    </Suspense>
  );
}
