/**
 * Extended Button Component with Loading State
 *
 * Extends the shadcn Button component with additional functionality:
 * - Loading state with spinner
 * - Additional variants (success, warning, danger)
 * - Consistent styling across the application
 *
 * Usage:
 * import { ButtonWithLoading } from '@/components/ui/button-variants';
 *
 * <ButtonWithLoading variant="primary" loading={isSubmitting}>
 *   Create Order
 * </ButtonWithLoading>
 *
 * Benefits:
 * - Consistent button styling (eliminates 8+ different implementations)
 * - Built-in loading states (no need to conditionally render children)
 * - Type-safe variants
 * - Accessible by default (inherits from shadcn)
 */

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Extended button variants with order-specific styles
const extendedButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        // Primary action (dark background)
        primary: 'bg-gray-900 text-white hover:bg-gray-700 focus-visible:ring-gray-500',

        // Secondary action (outlined)
        secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-300',

        // Success action (green)
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',

        // Warning action (amber)
        warning: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',

        // Danger/destructive action (red)
        danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',

        // Ghost button (no background)
        ghost: 'hover:bg-gray-100 text-gray-700 hover:text-gray-900',

        // Link style
        link: 'text-gray-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 py-1.5 text-xs',
        default: 'h-10 px-4 py-2 text-sm',
        lg: 'h-12 px-6 py-3 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonWithLoadingProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof extendedButtonVariants> {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Button component with loading state
 */
export const ButtonWithLoading = React.forwardRef<HTMLButtonElement, ButtonWithLoadingProps>(
  ({ className, variant, size, loading, loadingText, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(extendedButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  }
);

ButtonWithLoading.displayName = 'ButtonWithLoading';

/**
 * Preset button components for common actions
 */

export function PrimaryButton({ loading, children, ...props }: ButtonWithLoadingProps) {
  return (
    <ButtonWithLoading variant="primary" loading={loading} {...props}>
      {children}
    </ButtonWithLoading>
  );
}

export function SecondaryButton({ loading, children, ...props }: ButtonWithLoadingProps) {
  return (
    <ButtonWithLoading variant="secondary" loading={loading} {...props}>
      {children}
    </ButtonWithLoading>
  );
}

export function SuccessButton({ loading, children, ...props }: ButtonWithLoadingProps) {
  return (
    <ButtonWithLoading variant="success" loading={loading} {...props}>
      {children}
    </ButtonWithLoading>
  );
}

export function WarningButton({ loading, children, ...props }: ButtonWithLoadingProps) {
  return (
    <ButtonWithLoading variant="warning" loading={loading} {...props}>
      {children}
    </ButtonWithLoading>
  );
}

export function DangerButton({ loading, children, ...props }: ButtonWithLoadingProps) {
  return (
    <ButtonWithLoading variant="danger" loading={loading} {...props}>
      {children}
    </ButtonWithLoading>
  );
}

export function GhostButton({ loading, children, ...props }: ButtonWithLoadingProps) {
  return (
    <ButtonWithLoading variant="ghost" loading={loading} {...props}>
      {children}
    </ButtonWithLoading>
  );
}

/**
 * Export the variants for direct usage
 */
export { extendedButtonVariants };
