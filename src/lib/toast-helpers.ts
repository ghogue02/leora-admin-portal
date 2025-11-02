/**
 * Toast Notification Helpers
 *
 * Centralized toast notification utilities using Sonner.
 * Standardizes toast messages across the application.
 *
 * Usage:
 * import { showSuccess, showError, showLoading } from '@/lib/toast-helpers';
 *
 * Benefits:
 * - Consistent toast styling and duration
 * - Pre-configured common notifications (order created, inventory warning, etc.)
 * - Easy to update toast library without changing all call sites
 * - Type-safe notification parameters
 */

import { toast } from 'sonner';

/**
 * Show success toast
 */
export function showSuccess(message: string, description?: string, duration: number = 3000) {
  toast.success(message, { description, duration });
}

/**
 * Show error toast
 */
export function showError(error: Error | string, description?: string, duration: number = 5000) {
  const message = error instanceof Error ? error.message : error;
  toast.error(message, { description, duration });
}

/**
 * Show warning toast
 */
export function showWarning(message: string, description?: string, duration: number = 4000) {
  toast.warning(message, { description, duration });
}

/**
 * Show info toast
 */
export function showInfo(message: string, description?: string, duration: number = 3000) {
  toast.info(message, { description, duration });
}

/**
 * Show loading toast (returns toast ID for dismissal)
 */
export function showLoading(message: string): string | number {
  return toast.loading(message);
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
}

/**
 * Update an existing toast
 */
export function updateToast(toastId: string | number, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  // Sonner doesn't have direct update, so dismiss and show new
  dismissToast(toastId);
  switch (type) {
    case 'success':
      showSuccess(message);
      break;
    case 'error':
      showError(message);
      break;
    case 'warning':
      showWarning(message);
      break;
    default:
      showInfo(message);
  }
}

/**
 * Pre-configured Notifications for Common Actions
 */

export const notifications = {
  /**
   * Order created successfully
   */
  orderCreated: (orderId: string, requiresApproval: boolean = false) => {
    toast.success('Order created successfully', {
      description: requiresApproval
        ? `Order #${orderId.slice(0, 8).toUpperCase()} is pending manager approval`
        : `Order #${orderId.slice(0, 8).toUpperCase()} is ready for processing`,
      duration: 4000,
    });
  },

  /**
   * Order updated successfully
   */
  orderUpdated: (orderId: string) => {
    toast.success('Order updated successfully', {
      description: `Order #${orderId.slice(0, 8).toUpperCase()} has been updated`,
      duration: 3000,
    });
  },

  /**
   * Order status changed
   */
  orderStatusChanged: (orderId: string, status: string) => {
    toast.success('Order status updated', {
      description: `Order #${orderId.slice(0, 8).toUpperCase()} is now ${status.replace(/_/g, ' ').toLowerCase()}`,
      duration: 3000,
    });
  },

  /**
   * Product added to order
   */
  productAdded: (productName: string, quantity: number, lineTotal: number, warning?: string) => {
    if (warning) {
      toast.warning(`Added ${quantity}x ${productName} to order`, {
        description: `⚠ ${warning} • $${lineTotal.toFixed(2)} total`,
        duration: 4000,
      });
    } else {
      toast.success(`Added ${quantity}x ${productName} to order`, {
        description: `$${lineTotal.toFixed(2)} total`,
        duration: 3000,
      });
    }
  },

  /**
   * Product removed from order
   */
  productRemoved: (productName: string, onUndo?: () => void) => {
    toast.success('Product removed', {
      description: productName,
      duration: 5000,
      action: onUndo ? {
        label: 'Undo',
        onClick: onUndo,
      } : undefined,
    });
  },

  /**
   * Inventory warning
   */
  inventoryWarning: (productName: string, available: number, requested: number) => {
    toast.warning('Low inventory', {
      description: `${productName} - Only ${available} available (requested ${requested})`,
      duration: 5000,
    });
  },

  /**
   * Validation error
   */
  validationError: (message: string, description?: string) => {
    toast.error(message, {
      description: description || 'Please review the error messages and try again',
      duration: 5000,
    });
  },

  /**
   * Form saved (auto-save)
   */
  formSaved: () => {
    toast.success('Draft saved', {
      description: 'Your changes have been saved automatically',
      duration: 2000,
    });
  },

  /**
   * Bulk action completed
   */
  bulkActionCompleted: (action: string, count: number) => {
    toast.success(`${action} completed`, {
      description: `${count} ${count === 1 ? 'order' : 'orders'} updated successfully`,
      duration: 3000,
    });
  },

  /**
   * File uploaded
   */
  fileUploaded: (filename: string) => {
    toast.success('File uploaded', {
      description: filename,
      duration: 3000,
    });
  },

  /**
   * Export completed
   */
  exportCompleted: (filename: string) => {
    toast.success('Export completed', {
      description: `Downloaded ${filename}`,
      duration: 3000,
    });
  },

  /**
   * Network error
   */
  networkError: () => {
    toast.error('Network error', {
      description: 'Please check your internet connection and try again',
      duration: 5000,
    });
  },

  /**
   * Permission denied
   */
  permissionDenied: () => {
    toast.error('Permission denied', {
      description: 'You do not have permission to perform this action',
      duration: 5000,
    });
  },

  /**
   * Session expired
   */
  sessionExpired: () => {
    toast.error('Session expired', {
      description: 'Please log in again to continue',
      duration: 10000,
    });
  },
};
