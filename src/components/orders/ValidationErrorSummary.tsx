'use client';

/**
 * Validation Error Summary Component
 *
 * Fixes frontend agent's Issue #8: Error messages are vague & unhelpful
 *
 * Features:
 * - Shows all validation errors in one place
 * - Categorizes errors (Missing Info, Inventory Issues, etc.)
 * - Provides actionable suggestions
 * - Links to fields with errors
 * - Action buttons for common fixes
 */

type ValidationError = {
  field: string;
  message: string;
  type: 'missing' | 'inventory' | 'validation';
  suggestion?: string;
};

type InventoryIssue = {
  productName: string;
  skuCode: string;
  requested: number;
  available: number;
  shortfall: number;
};

type Props = {
  errors: ValidationError[];
  inventoryIssues?: InventoryIssue[];
  onReduceQuantities?: () => void;
  onSubmitForApproval?: () => void;
  onDismiss?: () => void;
};

export function ValidationErrorSummary({
  errors,
  inventoryIssues = [],
  onReduceQuantities,
  onSubmitForApproval,
  onDismiss,
}: Props) {
  if (errors.length === 0 && inventoryIssues.length === 0) {
    return null;
  }

  const missingFields = errors.filter(e => e.type === 'missing');
  const validationErrors = errors.filter(e => e.type === 'validation');
  const hasInventoryIssues = inventoryIssues.length > 0;

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-rose-900">
            ❌ Cannot Create Order
          </h3>
          <p className="mt-1 text-sm text-rose-700">
            Please address the following issues before submitting:
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {/* Missing Information */}
        {missingFields.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-rose-900 mb-2">
              Missing Required Information:
            </h4>
            <ul className="space-y-1">
              {missingFields.map((error, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-rose-600">•</span>
                  <span className="text-rose-800">
                    <strong>{error.field}:</strong> {error.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-rose-900 mb-2">
              Validation Issues:
            </h4>
            <ul className="space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-rose-600">•</span>
                  <div className="text-rose-800">
                    <strong>{error.field}:</strong> {error.message}
                    {error.suggestion && (
                      <div className="mt-1 text-xs text-rose-700">
                        💡 Tip: {error.suggestion}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Inventory Issues */}
        {hasInventoryIssues && (
          <div>
            <h4 className="text-sm font-semibold text-rose-900 mb-2">
              Inventory Constraints:
            </h4>
            <ul className="space-y-2">
              {inventoryIssues.map((issue, index) => (
                <li key={index} className="rounded-md bg-white border border-rose-300 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {issue.productName}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        SKU: {issue.skuCode}
                      </div>
                      <div className="mt-2 text-sm text-rose-700">
                        Requesting <strong>{issue.requested}</strong> units, only{' '}
                        <strong>{issue.available}</strong> available
                        <span className="ml-1 font-semibold">
                          (Short by {issue.shortfall})
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {onReduceQuantities && onSubmitForApproval && (
              <div className="mt-3 text-xs text-rose-700">
                💡 Tip: Reduce quantities to available amounts or submit for manager approval
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(onReduceQuantities || onSubmitForApproval) && (
        <div className="mt-4 flex items-center gap-3 border-t border-rose-200 pt-4">
          {onReduceQuantities && (
            <button
              type="button"
              onClick={onReduceQuantities}
              className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Reduce to Available
            </button>
          )}
          {onSubmitForApproval && (
            <button
              type="button"
              onClick={onSubmitForApproval}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Submit for Approval Anyway
            </button>
          )}
        </div>
      )}
    </div>
  );
}
