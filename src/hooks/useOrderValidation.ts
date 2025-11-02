/**
 * Order Form Validation Hook
 *
 * Centralized validation logic for order entry and editing.
 * Consolidates validation from multiple locations into a single source of truth.
 *
 * Usage:
 * const { validateCustomer, validateDeliveryDate, validateProducts, validateForm } = useOrderValidation();
 *
 * Benefits:
 * - Single source of truth for validation rules
 * - Reusable across order creation, editing, approval
 * - Type-safe validation
 * - Consistent error messages
 */

import { useCallback } from 'react';

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export type ValidationError = {
  field: string;
  message: string;
  type: 'missing' | 'validation';
};

export type Customer = {
  id: string;
  name: string;
  territory: string | null;
  requiresPO: boolean;
  [key: string]: any;
};

export type OrderItem = {
  skuId: string;
  quantity: number;
  [key: string]: any;
};

export type OrderFormData = {
  customer: Customer | null;
  deliveryDate: string;
  warehouseLocation: string;
  poNumber: string;
  items: OrderItem[];
};

export function useOrderValidation() {
  /**
   * Validate customer selection
   */
  const validateCustomer = useCallback((customer: Customer | null): ValidationResult => {
    if (!customer) {
      return { valid: false, error: 'Please select a customer' };
    }
    return { valid: true };
  }, []);

  /**
   * Validate delivery date
   */
  const validateDeliveryDate = useCallback((date: string, territory?: string | null): ValidationResult => {
    if (!date) {
      return { valid: false, error: 'Please select a delivery date' };
    }

    // Validate date is not in the past
    const deliveryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deliveryDate < today) {
      return { valid: false, error: 'Delivery date cannot be in the past' };
    }

    // Additional territory-specific validation could go here
    // For example: Check if date is a valid delivery day for territory

    return { valid: true };
  }, []);

  /**
   * Validate warehouse selection
   */
  const validateWarehouse = useCallback((warehouse: string): ValidationResult => {
    if (!warehouse) {
      return { valid: false, error: 'Please select a warehouse location' };
    }
    return { valid: true };
  }, []);

  /**
   * Validate PO number (conditional based on customer requirements)
   */
  const validatePONumber = useCallback((
    poNumber: string,
    customer: Customer | null
  ): ValidationResult => {
    if (customer?.requiresPO && !poNumber.trim()) {
      return { valid: false, error: 'PO number is required for this customer' };
    }
    return { valid: true };
  }, []);

  /**
   * Validate products/items list
   */
  const validateProducts = useCallback((items: OrderItem[]): ValidationResult => {
    if (items.length === 0) {
      return { valid: false, error: 'Please add at least one product to the order' };
    }

    // Validate each item has valid quantity
    const invalidItem = items.find(item => !item.quantity || item.quantity < 1);
    if (invalidItem) {
      return { valid: false, error: 'All products must have a quantity of at least 1' };
    }

    return { valid: true };
  }, []);

  /**
   * Validate entire order form
   * Returns array of all validation errors found
   */
  const validateForm = useCallback((formData: OrderFormData): { valid: boolean; errors: ValidationError[] } => {
    const errors: ValidationError[] = [];

    // Validate customer
    const customerCheck = validateCustomer(formData.customer);
    if (!customerCheck.valid) {
      errors.push({ field: 'Customer', message: customerCheck.error!, type: 'missing' });
    }

    // Validate delivery date
    const dateCheck = validateDeliveryDate(formData.deliveryDate, formData.customer?.territory);
    if (!dateCheck.valid) {
      errors.push({ field: 'Delivery Date', message: dateCheck.error!, type: 'validation' });
    }

    // Validate warehouse
    const warehouseCheck = validateWarehouse(formData.warehouseLocation);
    if (!warehouseCheck.valid) {
      errors.push({ field: 'Warehouse', message: warehouseCheck.error!, type: 'missing' });
    }

    // Validate PO number
    const poCheck = validatePONumber(formData.poNumber, formData.customer);
    if (!poCheck.valid) {
      errors.push({ field: 'PO Number', message: poCheck.error!, type: 'validation' });
    }

    // Validate products
    const productsCheck = validateProducts(formData.items);
    if (!productsCheck.valid) {
      errors.push({ field: 'Products', message: productsCheck.error!, type: 'missing' });
    }

    return { valid: errors.length === 0, errors };
  }, [validateCustomer, validateDeliveryDate, validateWarehouse, validatePONumber, validateProducts]);

  /**
   * Validate a single field by name
   * Useful for inline validation as user types
   */
  const validateField = useCallback((
    field: keyof OrderFormData,
    value: any,
    context?: Partial<OrderFormData>
  ): ValidationResult => {
    switch (field) {
      case 'customer':
        return validateCustomer(value);
      case 'deliveryDate':
        return validateDeliveryDate(value, context?.customer?.territory);
      case 'warehouseLocation':
        return validateWarehouse(value);
      case 'poNumber':
        return validatePONumber(value, context?.customer || null);
      case 'items':
        return validateProducts(value);
      default:
        return { valid: true };
    }
  }, [validateCustomer, validateDeliveryDate, validateWarehouse, validatePONumber, validateProducts]);

  return {
    validateCustomer,
    validateDeliveryDate,
    validateWarehouse,
    validatePONumber,
    validateProducts,
    validateForm,
    validateField,
  };
}
