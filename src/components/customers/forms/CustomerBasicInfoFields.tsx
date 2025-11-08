"use client";

import clsx from "clsx";
import { PAYMENT_TERM_OPTIONS } from "@/constants/paymentTerms";

type BasicInfoValues = {
  name: string;
  accountNumber: string | null;
  billingEmail: string | null;
  phone: string | null;
  paymentTerms: string | null;
  licenseNumber: string | null;
};

type CustomerBasicInfoFieldsProps = {
  values: BasicInfoValues;
  onChange: (field: keyof BasicInfoValues, value: string | null) => void;
  disabled?: boolean;
  requireName?: boolean;
  readOnlyFields?: Partial<Record<keyof BasicInfoValues, boolean>>;
};

export function CustomerBasicInfoFields({
  values,
  onChange,
  disabled = false,
  requireName = true,
  readOnlyFields = {},
}: CustomerBasicInfoFieldsProps) {
  const paymentTermList = [...PAYMENT_TERM_OPTIONS] as string[];
  const hasCustomPaymentTerms =
    !!values.paymentTerms &&
    !paymentTermList.includes(values.paymentTerms as (typeof PAYMENT_TERM_OPTIONS)[number]);
  const selectedPaymentOption = hasCustomPaymentTerms ? "__custom__" : values.paymentTerms ?? "";

  const handlePaymentTermsChange = (value: string) => {
    if (value === "__custom__") {
      onChange("paymentTerms", values.paymentTerms ?? "");
      return;
    }
    onChange("paymentTerms", value || null);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-name">
          Customer Name {requireName && <span className="text-red-500">*</span>}
        </label>
        <input
          id="customer-name"
          type="text"
          required={requireName}
          disabled={disabled}
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-account">
          Account Number
        </label>
        <input
          id="customer-account"
          type="text"
          disabled={disabled || readOnlyFields.accountNumber}
          value={values.accountNumber ?? ''}
          onChange={(e) => onChange('accountNumber', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            (disabled || readOnlyFields.accountNumber) && 'bg-gray-50'
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-email">
          Billing Email
        </label>
        <input
          id="customer-email"
          type="email"
          disabled={disabled}
          value={values.billingEmail ?? ''}
          onChange={(e) => onChange('billingEmail', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-phone">
          Phone
        </label>
        <input
          id="customer-phone"
          type="tel"
          disabled={disabled}
          value={values.phone ?? ''}
          onChange={(e) => onChange('phone', e.target.value || null)}
          className={clsx(
            'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            disabled && 'bg-gray-50'
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-license">
          License Number
        </label>
        <input
          id="customer-license"
          type="text"
          disabled={disabled}
          value={values.licenseNumber ?? ""}
          onChange={(e) => onChange("licenseNumber", e.target.value || null)}
          className={clsx(
            "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
            disabled && "bg-gray-50"
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-payment-terms">
          Payment Terms
        </label>
        <select
          id="customer-payment-terms"
          disabled={disabled}
          value={selectedPaymentOption}
          onChange={(e) => handlePaymentTermsChange(e.target.value)}
          className={clsx(
            "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
            disabled && "bg-gray-50"
          )}
        >
          <option value="">-- Select Payment Terms --</option>
          {paymentTermList.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value="__custom__">Other / Custom</option>
        </select>
        {selectedPaymentOption === "__custom__" && (
          <input
            type="text"
            value={values.paymentTerms ?? ""}
            onChange={(event) => onChange("paymentTerms", event.target.value || null)}
            placeholder="Enter custom payment terms"
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
        <p className="mt-1 text-xs text-gray-500">
          Options pulled from configured payment terms. Choose a value to keep SAGE exports aligned.
        </p>
      </div>
    </div>
  );
}
