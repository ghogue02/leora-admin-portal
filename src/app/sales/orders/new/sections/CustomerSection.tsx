/**
 * CustomerSection - Customer and salesperson selection
 */

'use client';

import { CustomerSearchCombobox, type Customer } from '@/components/orders/CustomerSearchCombobox';

type SalesRepOption = {
  id: string;
  name: string;
  territory: string | null;
  email: string | null;
  orderEntryEnabled?: boolean;
};

type CustomerSectionProps = {
  selectedCustomerId: string;
  selectedCustomer: Customer | null;
  selectedSalesRepId: string | null;
  customerDefaultSalesRepName: string | null;
  salesRepOptions: SalesRepOption[];
  salesRepOptionsLoading: boolean;
  isSalesRepOverride: boolean;
  fieldErrors: Record<string, string>;
  onCustomerSelect: (customer: Customer) => void;
  onSalesRepChange: (repId: string | null) => void;
  validateField: (field: string, value: unknown) => void;
};

export function CustomerSection({
  selectedCustomerId,
  selectedCustomer,
  selectedSalesRepId,
  customerDefaultSalesRepName,
  salesRepOptions,
  salesRepOptionsLoading,
  isSalesRepOverride,
  fieldErrors,
  onCustomerSelect,
  onSalesRepChange,
  validateField,
}: CustomerSectionProps) {
  return (
    <div className="space-y-4">
      {/* Customer Selection */}
      <div>
        <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
          Customer <span className="text-rose-600">*</span>
        </label>
        <CustomerSearchCombobox
          value={selectedCustomerId}
          onChange={onCustomerSelect}
          error={fieldErrors.customer}
        />
        {fieldErrors.customer && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.customer}</p>
        )}
      </div>

      {/* Salesperson Selection */}
      <div>
        <label htmlFor="salesRep" className="block text-sm font-medium text-gray-700 mb-1">
          Salesperson <span className="text-rose-600">*</span>
        </label>
        <select
          id="salesRep"
          value={selectedSalesRepId ?? ''}
          onChange={(e) => {
            const nextId = e.target.value || null;
            onSalesRepChange(nextId);
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
          {salesRepOptions.map((rep) => (
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
  );
}
