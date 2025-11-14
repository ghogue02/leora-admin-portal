/**
 * DeliverySection - Delivery settings and preferences
 */

'use client';

import { DeliveryDatePicker } from '@/components/orders/DeliveryDatePicker';
import { WarehouseSelector } from '@/components/orders/WarehouseSelector';
import { DELIVERY_METHOD_OPTIONS } from '@/constants/deliveryMethods';

type DeliverySectionProps = {
  deliveryDate: string;
  warehouseLocation: string;
  deliveryTimeWindow: string;
  deliveryMethod: string;
  poNumber: string;
  specialInstructions: string;
  customerDeliveryWindows: string[];
  salesRepDeliveryDays: string[];
  customerRequiresPO: boolean;
  fieldErrors: Record<string, string>;
  onDeliveryDateChange: (date: string) => void;
  onWarehouseChange: (warehouse: string) => void;
  onDeliveryTimeWindowChange: (window: string) => void;
  onDeliveryMethodChange: (method: string) => void;
  onPoNumberChange: (po: string) => void;
  onSpecialInstructionsChange: (instructions: string) => void;
  validateField: (field: string, value: unknown) => void;
};

export function DeliverySection({
  deliveryDate,
  warehouseLocation,
  deliveryTimeWindow,
  deliveryMethod,
  poNumber,
  specialInstructions,
  customerDeliveryWindows,
  salesRepDeliveryDays,
  customerRequiresPO,
  fieldErrors,
  onDeliveryDateChange,
  onWarehouseChange,
  onDeliveryTimeWindowChange,
  onDeliveryMethodChange,
  onPoNumberChange,
  onSpecialInstructionsChange,
  validateField,
}: DeliverySectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Delivery Date */}
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
            onDeliveryDateChange(date);
            validateField('deliveryDate', date);
          }}
          deliveryDays={salesRepDeliveryDays}
          error={fieldErrors.deliveryDate}
        />
        {fieldErrors.deliveryDate && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.deliveryDate}</p>
        )}
      </div>

      {/* Warehouse Location */}
      <div>
        <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700">
          Warehouse Location <span className="text-rose-600">*</span>
        </label>
        <WarehouseSelector
          value={warehouseLocation}
          onChange={(warehouse) => {
            onWarehouseChange(warehouse);
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

      {/* Delivery Time Window */}
      <div>
        <label htmlFor="timeWindow" className="block text-sm font-medium text-gray-700">
          Delivery Time Window <span className="text-xs font-normal text-gray-500">(Optional)</span>
          <span className="ml-1 cursor-help text-gray-400" title="Preferred time window for delivery. Leave as 'Anytime' if no preference.">
            ⓘ
          </span>
        </label>
        <select
          id="timeWindow"
          value={deliveryTimeWindow}
          onChange={(e) => onDeliveryTimeWindowChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
        >
          <optgroup label="Standard Windows">
            <option value="anytime">Anytime</option>
            <option value="8am-12pm">Morning (8am - 12pm)</option>
            <option value="12pm-5pm">Afternoon (12pm - 5pm)</option>
            <option value="after-5pm">Evening (After 5pm)</option>
          </optgroup>
          {customerDeliveryWindows.length > 0 && (
            <optgroup label="Customer Preferences">
              {customerDeliveryWindows.map((window) => (
                <option key={window} value={window}>
                  {window}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Delivery Method */}
      <div>
        <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-700">
          Delivery Method <span className="text-rose-600">*</span>
        </label>
        <select
          id="deliveryMethod"
          value={deliveryMethod}
          onChange={(e) => onDeliveryMethodChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
        >
          {DELIVERY_METHOD_OPTIONS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      {/* PO Number */}
      <div>
        <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700">
          PO Number{' '}
          {customerRequiresPO ? (
            <span className="text-rose-600">*</span>
          ) : (
            <span className="text-xs font-normal text-gray-500">(Optional)</span>
          )}
        </label>
        <input
          id="poNumber"
          type="text"
          value={poNumber}
          onChange={(e) => onPoNumberChange(e.target.value)}
          onBlur={(e) => validateField('poNumber', e.target.value)}
          placeholder="Customer PO number"
          className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 ${
            fieldErrors.poNumber
              ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
              : 'border-gray-300 focus:border-gray-500 focus:ring-gray-200'
          }`}
          required={customerRequiresPO}
        />
        {customerRequiresPO && !fieldErrors.poNumber && (
          <p className="mt-1 text-xs text-gray-600">This customer requires a PO number for all orders</p>
        )}
        {fieldErrors.poNumber && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.poNumber}</p>
        )}
      </div>

      {/* Special Instructions */}
      <div className="sm:col-span-2">
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">
          Special Instructions <span className="text-xs font-normal text-gray-500">(Optional)</span>
        </label>
        <textarea
          id="instructions"
          value={specialInstructions}
          onChange={(e) => onSpecialInstructionsChange(e.target.value)}
          placeholder="Delivery instructions, gate codes, special handling requirements, etc."
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
