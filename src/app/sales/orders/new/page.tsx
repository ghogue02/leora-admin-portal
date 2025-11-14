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
import { ProductGrid } from '@/components/orders/ProductGrid';
import { CustomerSearchCombobox, type Customer } from '@/components/orders/CustomerSearchCombobox';
import { OrderSummarySidebar } from '@/components/orders/OrderSummarySidebar';
import { ValidationErrorSummary } from '@/components/orders/ValidationErrorSummary';
import { OrderSuccessModal } from '@/components/orders/OrderSuccessModal';
import { OrderPreviewModal } from '@/components/orders/OrderPreviewModal';
import { FormProgress } from '@/components/orders/FormProgress';
import {
  OrderAccordionSection,
  OrderActionFooter,
  type OrderSectionKey,
  type OrderAccordionStatus,
} from '@/components/orders/OrderFormLayout';
import { resolvePriceForQuantity, PriceListSummary, PricingSelection, CustomerPricingContext } from '@/components/orders/pricing-utils';
import { PriceOverride } from '@/components/orders/ProductGrid';
import { formatUTCDate } from '@/lib/dates';
import { formatShortDate } from '@/lib/format';
import { ORDER_USAGE_OPTIONS, ORDER_USAGE_LABELS, type OrderUsageCode } from '@/constants/orderUsage';
import { DELIVERY_METHOD_OPTIONS } from '@/constants/deliveryMethods';
import { formatDeliveryWindows } from '@/lib/delivery-window';
import { useRecentItems } from './hooks/useRecentItems';
import type { MinimumOrderPolicyClient, RecentPurchaseSuggestion } from '@/types/orders';
import { CustomerSection } from './sections/CustomerSection';
import { DeliverySection } from './sections/DeliverySection';
import { RecentPurchasesSection } from './sections/RecentPurchasesSection';
import { ProductsSection } from './sections/ProductsSection';

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

function NewOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [warehouseLocation, setWarehouseLocation] = useState<string>('Warrenton');
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<string>(DELIVERY_METHOD_OPTIONS[0]);
  const [poNumber, setPoNumber] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [customerDeliveryWindows, setCustomerDeliveryWindows] = useState<string[]>([]);
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
  const [tenantMinimumPolicy, setTenantMinimumPolicy] = useState<MinimumOrderPolicyClient | null>(null);
  const [openSections, setOpenSections] = useState<Record<OrderSectionKey | 'recentPurchases', boolean>>({
    customer: true,
    delivery: true,
    recentPurchases: true,
    products: true,
  });

  const getSalesRepNameById = useCallback(
    (repId: string | null | undefined) => {
      if (!repId) return null;
      const match = salesRepOptions.find((rep) => rep.id === repId);
      return match?.name ?? null;
    },
    [salesRepOptions],
  );

  const toggleSection = useCallback((section: OrderSectionKey | 'recentPurchases') => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

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
  const [createdOrderData, setCreatedOrderData] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
    requiresApproval: boolean;
    minimumOrder: { threshold: number | null; violation: boolean } | null;
  } | null>(null);
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

  const handleQuantityChange = useCallback((index: number, quantity: number) => {
    setOrderItems(prev => {
      const item = prev[index];
      if (!item) return prev;

      const pricing = resolvePriceForQuantity(
        item.priceLists,
        Math.max(quantity, 1),
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

      const newItems = [...prev];
      newItems[index] = {
        ...item,
        quantity,
        unitPrice: resolvedUnitPrice,
        lineTotal: quantity * resolvedUnitPrice,
        pricing: effectivePricing,
      };
      return newItems;
    });
  }, [customerPricingContext]);

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

  useEffect(() => {
    async function loadMinimumOrderPolicy() {
      try {
        const response = await fetch('/api/sales/settings/minimum-order');
        if (!response.ok) {
          throw new Error('Failed to load minimum order policy');
        }
        const data = await response.json();
        setTenantMinimumPolicy(data.policy ?? null);
      } catch (err) {
        console.error('Failed to load minimum order policy', err);
        setTenantMinimumPolicy(null);
      }
    }

    void loadMinimumOrderPolicy();
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

    const formattedWindows = formatDeliveryWindows(customer.deliveryWindows);
    setCustomerDeliveryWindows(formattedWindows);

    const preferredWindow = formattedWindows[0] || customer.defaultDeliveryTimeWindow || 'anytime';
    setDeliveryTimeWindow(preferredWindow || 'anytime');

    setSpecialInstructions(customer.deliveryInstructions ?? '');
    setDeliveryMethod(customer.deliveryMethod || DELIVERY_METHOD_OPTIONS[0]);

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
          deliveryInstructions: data.customer.deliveryInstructions ?? null,
          deliveryWindows: Array.isArray(data.customer.deliveryWindows) ? data.customer.deliveryWindows : [],
          deliveryMethod: data.customer.deliveryMethod ?? null,
          minimumOrderOverride:
            data.customer.minimumOrderOverride !== null && typeof data.customer.minimumOrderOverride !== 'undefined'
              ? Number(data.customer.minimumOrderOverride)
              : null,
          minimumOrderOverrideNotes: data.customer.minimumOrderOverrideNotes ?? null,
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

  const minimumOrderContext = useMemo(() => {
    if (!tenantMinimumPolicy) {
      return null;
    }

    const overrideAmount =
      selectedCustomer?.minimumOrderOverride !== null && typeof selectedCustomer?.minimumOrderOverride !== 'undefined'
        ? selectedCustomer?.minimumOrderOverride
        : null;

    const tenantAmount = tenantMinimumPolicy.appliedAmount ?? null;
    const threshold = overrideAmount ?? tenantAmount;

    if (threshold === null) {
      return {
        threshold: null,
        source: tenantMinimumPolicy.source,
        enforcementEnabled: tenantMinimumPolicy.enforcementEnabled,
      };
    }

    return {
      threshold,
      source: overrideAmount ? 'customer' : 'tenant',
      enforcementEnabled: tenantMinimumPolicy.enforcementEnabled,
    };
  }, [tenantMinimumPolicy, selectedCustomer]);

  const minimumOrderThreshold =
    typeof minimumOrderContext?.threshold === 'number' ? minimumOrderContext.threshold : null;
  const minimumOrderEnforced = Boolean(minimumOrderContext?.enforcementEnabled);
  const minimumOrderApplies =
    minimumOrderThreshold !== null && Number.isFinite(minimumOrderThreshold) && minimumOrderThreshold > 0;
  const minimumOrderViolation =
    minimumOrderApplies && minimumOrderEnforced ? orderTotal < (minimumOrderThreshold ?? 0) : false;
  const minimumOrderShortfall =
    minimumOrderApplies && minimumOrderThreshold !== null
      ? Math.max(0, minimumOrderThreshold - orderTotal)
      : 0;
  const minimumOrderSource = minimumOrderContext?.source ?? null;
  const minimumOrderWarningOnly =
    minimumOrderApplies && !minimumOrderEnforced && minimumOrderThreshold !== null
      ? orderTotal < minimumOrderThreshold
      : false;

  const hasLowInventoryItems = orderItems.some(
    (item) => item.inventoryStatus && !item.inventoryStatus.sufficient
  );
  const lineLevelApproval = orderItems.some(
    (item) =>
      (item.inventoryStatus && !item.inventoryStatus.sufficient) ||
      item.pricing.overrideApplied ||
      !!item.priceOverride,
  );
  const requiresApproval = lineLevelApproval || minimumOrderViolation;
  const estimatedTotal = useMemo(
    () => orderTotal + deliveryFee + splitCaseFee,
    [orderTotal, deliveryFee, splitCaseFee],
  );

  const sectionStatuses = useMemo<Record<OrderSectionKey, OrderAccordionStatus>>(() => {
    const customerReady = Boolean(selectedCustomer && selectedSalesRepId);
    const deliveryReady = Boolean(deliveryDate && warehouseLocation && deliveryMethod);
    const productsReady =
      orderItems.length > 0 && orderItems.every((item) => item.quantity && item.quantity > 0);

    return {
      customer: customerReady
        ? { tone: 'success', label: 'Complete' }
        : {
            tone: selectedCustomer ? 'warning' : 'danger',
            label: selectedCustomer ? 'Assign salesperson' : 'Select customer',
          },
      delivery: deliveryReady
        ? { tone: 'success', label: 'Scheduled' }
        : undefined, // Don't show warning badge for delivery section
      products: productsReady
        ? { tone: 'success', label: 'Ready' }
        : {
            tone: orderItems.length === 0 ? 'danger' : 'warning',
            label: orderItems.length === 0 ? 'Add products' : 'Check quantities',
          },
    };
  }, [deliveryDate, deliveryMethod, orderItems, selectedCustomer, selectedSalesRepId, warehouseLocation]);

  const inlineFieldIssueCount = Object.keys(fieldErrors).length;
  const outstandingIssues = validationErrors.length > 0 ? validationErrors.length : inlineFieldIssueCount;

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
    if (!deliveryMethod) {
      errors.push({ field: 'Delivery Method', message: 'Please choose a delivery method', type: 'missing' });
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
  }, [selectedCustomer, deliveryDate, warehouseLocation, deliveryMethod, poNumber, orderItems, selectedSalesRepId]);

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
            deliveryMethod,
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
        const errorMessage = data.error || 'Failed to create order';
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Show success modal instead of immediate redirect
      setCreatedOrderData({
        orderId: result.orderId,
        orderNumber: result.orderNumber || result.orderId.slice(0, 8).toUpperCase(),
        total: orderTotal,
        requiresApproval: result.requiresApproval || false,
        minimumOrder: result.minimumOrder ?? null,
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
  }, [
    selectedCustomer,
    deliveryDate,
    warehouseLocation,
    deliveryTimeWindow,
    deliveryMethod,
    poNumber,
    specialInstructions,
    orderItems,
    orderTotal,
    selectedSalesRepId,
  ]);

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
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-4 sm:mb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
          <p className="mt-1 text-sm text-gray-600">
            Direct order entry - no cart required
          </p>
        </div>
        <Link
          href="/sales/orders"
          className="touch-target inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
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

      {validationErrors.length === 0 && orderItems.some(item => item.inventoryStatus && !item.inventoryStatus.sufficient) && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">⚠ Manager Approval Required</p>
          <p className="mt-1 text-sm text-amber-700">
            This order includes low inventory items and will require manager review before processing.
          </p>
        </div>
      )}

      {/* 2-Column Layout: Form + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Form Column */}
        <form onSubmit={handleShowPreview} className="relative space-y-6 pb-48">
        <OrderAccordionSection
          id="customer"
          title="Customer Information"
          status={sectionStatuses.customer}
          isOpen={openSections.customer}
          onToggle={() => toggleSection('customer')}
        >
          <CustomerSection
            selectedCustomerId={selectedCustomerId}
            selectedCustomer={selectedCustomer}
            selectedSalesRepId={selectedSalesRepId}
            customerDefaultSalesRepName={customerDefaultSalesRepName}
            salesRepOptions={combinedSalesRepOptions}
            salesRepOptionsLoading={salesRepOptionsLoading}
            isSalesRepOverride={isSalesRepOverride}
            fieldErrors={fieldErrors}
            onCustomerSelect={handleCustomerSelect}
            onSalesRepChange={(repId) => {
              setSelectedSalesRepId(repId);
              const derivedName =
                getSalesRepNameById(repId) ??
                (repId === customerDefaultSalesRepId ? customerDefaultSalesRepName : null) ??
                (repId === loggedInSalesRepId ? loggedInSalesRepName : null);
              setSelectedSalesRepName(derivedName ?? null);
            }}
            validateField={validateField}
          />
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
          <DeliverySection
            deliveryDate={deliveryDate}
            warehouseLocation={warehouseLocation}
            deliveryTimeWindow={deliveryTimeWindow}
            deliveryMethod={deliveryMethod}
            poNumber={poNumber}
            specialInstructions={specialInstructions}
            customerDeliveryWindows={customerDeliveryWindows}
            salesRepDeliveryDays={salesRepDeliveryDays}
            customerRequiresPO={selectedCustomer?.requiresPO ?? false}
            fieldErrors={fieldErrors}
            onDeliveryDateChange={setDeliveryDate}
            onWarehouseChange={setWarehouseLocation}
            onDeliveryTimeWindowChange={setDeliveryTimeWindow}
            onDeliveryMethodChange={setDeliveryMethod}
            onPoNumberChange={setPoNumber}
            onSpecialInstructionsChange={setSpecialInstructions}
            validateField={validateField}
          />
        </OrderAccordionSection>

        {/* Section: Recent Purchases */}
        {selectedCustomer && (
          <OrderAccordionSection
            title="Recent Purchases"
            description="Items this customer has ordered in the last six months—add them with one tap."
            isOpen={openSections.recentPurchases}
            onToggle={() => toggleSection('recentPurchases')}
          >
            <RecentPurchasesSection
              recentItems={recentItems}
              loading={recentItemsLoading}
              error={recentItemsError}
              orderSkuIds={orderSkuIds}
              onAddItem={handleAddRecentItem}
              onAddAllItems={handleAddAllRecentItems}
            />
          </OrderAccordionSection>
        )}

        {/* Section 3: Products */}
        <OrderAccordionSection
          id="products"
          title="Products & Pricing"
          description="Add SKUs, adjust pricing, and review live inventory"
          status={sectionStatuses.products}
          isOpen={openSections.products}
          onToggle={() => toggleSection('products')}
        >
          <ProductsSection
            orderItems={orderItems}
            canOpenProductSelector={Boolean(selectedCustomer && warehouseLocation)}
            fieldErrors={fieldErrors}
            onAddProductsClick={() => setShowProductSelector(true)}
            onQuantityChange={handleQuantityChange}
            onUsageSelect={handleUsageSelect}
            onRemoveItem={(index) => setOrderItems(orderItems.filter((_, i) => i !== index))}
          />
        </OrderAccordionSection>

          <OrderActionFooter
            total={estimatedTotal}
            requiresApproval={requiresApproval}
            issuesCount={outstandingIssues}
            isFormValid={isFormValid}
            submitting={submitting}
            primaryLabel="Review Order"
          />
        </form>

        {/* Sidebar Column */}
        <OrderSummarySidebar
          customer={selectedCustomer}
          deliveryDate={deliveryDate}
          warehouseLocation={warehouseLocation}
          deliveryTimeWindow={deliveryTimeWindow}
          deliveryMethod={deliveryMethod}
          poNumber={poNumber}
          items={orderItems}
          onRemoveItem={(skuId) => {
            setOrderItems(orderItems.filter(item => item.skuId !== skuId));
          }}
          requiresApproval={hasLowInventoryItems}
          minimumOrderThreshold={minimumOrderThreshold}
          minimumOrderViolation={minimumOrderViolation}
          minimumOrderShortfall={minimumOrderShortfall}
          minimumOrderSource={minimumOrderSource}
          minimumOrderWarningOnly={minimumOrderWarningOnly}
          minimumOrderEnforced={minimumOrderEnforced}
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
          deliveryMethod={deliveryMethod}
          poNumber={poNumber}
          specialInstructions={specialInstructions}
          customerDeliveryInstructions={selectedCustomer.deliveryInstructions ?? null}
          customerDeliveryWindows={customerDeliveryWindows}
          items={orderItems}
          total={orderTotal}
          requiresApproval={requiresApproval}
          minimumOrderThreshold={minimumOrderThreshold}
          minimumOrderViolation={minimumOrderViolation}
          minimumOrderShortfall={minimumOrderShortfall}
          minimumOrderEnforced={minimumOrderEnforced}
          minimumOrderSource={minimumOrderSource}
          minimumOrderWarningOnly={minimumOrderWarningOnly}
          salesRepName={
            selectedSalesRepName ??
            customerDefaultSalesRepName ??
            loggedInSalesRepName ??
            null
          }
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowPreviewModal(false)}
          submitting={submitting}
          statusSelectionEnabled
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
          minimumOrder={createdOrderData.minimumOrder}
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
            setDeliveryMethod(DELIVERY_METHOD_OPTIONS[0]);
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
            setCustomerDeliveryWindows([]);
          }}
        />
      )}
    </main>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="layout-shell-tight layout-stack pb-12">
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
