"use client";

import { useMemo } from "react";
import { PAYMENT_METHOD_OPTIONS, PaymentMethod, DeliveryWindow } from "@/types/customer";
import { DELIVERY_METHOD_OPTIONS } from "@/constants/deliveryMethods";
import clsx from "clsx";

type DeliveryFieldValues = {
  deliveryInstructions: string | null;
  deliveryWindows: DeliveryWindow[];
  paymentMethod: PaymentMethod | string | null;
  deliveryMethod: string | null;
  defaultWarehouseLocation: string | null;
};

type CustomerDeliveryFieldsProps = {
  values: DeliveryFieldValues;
  onChange: (updates: Partial<DeliveryFieldValues>) => void;
  disabled?: boolean;
};

const DELIVERY_WINDOW_TYPES: DeliveryWindow["type"][] = ["BEFORE", "AFTER", "BETWEEN"];

function formatWindow(window: DeliveryWindow) {
  if (window.type === "BEFORE") {
    return `Before ${window.time}`;
  }
  if (window.type === "AFTER") {
    return `After ${window.time}`;
  }
  return `Between ${window.startTime} – ${window.endTime}`;
}

export function CustomerDeliveryFields({
  values,
  onChange,
  disabled = false,
}: CustomerDeliveryFieldsProps) {
  const paymentOptions = PAYMENT_METHOD_OPTIONS as readonly string[];
  const deliveryOptions = DELIVERY_METHOD_OPTIONS as readonly string[];

  const deliveryWindowSummary = useMemo(() => {
    if (!values.deliveryWindows?.length) return values.deliveryInstructions ? null : "No preferred delivery window recorded.";
    return values.deliveryWindows.map(formatWindow).join("; ");
  }, [values.deliveryWindows, values.deliveryInstructions]);

  const updateWindow = (index: number, updates: Partial<DeliveryWindow>) => {
    const next = values.deliveryWindows.map((window, idx) =>
      idx === index ? { ...window, ...updates } : window
    );
    onChange({ deliveryWindows: next });
  };

  const addWindow = () => {
    const next: DeliveryWindow = { type: "BETWEEN", startTime: "09:00", endTime: "12:00" };
    onChange({ deliveryWindows: [...(values.deliveryWindows ?? []), next] });
  };

  const removeWindow = (index: number) => {
    const next = values.deliveryWindows.filter((_, idx) => idx !== index);
    onChange({ deliveryWindows: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="delivery-instructions">
          Delivery Instructions
        </label>
        <textarea
          id="delivery-instructions"
          rows={3}
          disabled={disabled}
          value={values.deliveryInstructions ?? ""}
          onChange={(event) => onChange({ deliveryInstructions: event.target.value || null })}
          className={clsx(
            "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
            disabled && "bg-gray-50"
          )}
          placeholder="Example: Deliver via back alley entrance. Call upon arrival."
        />
        <p className="mt-1 text-xs text-gray-500">
          Capture special handling notes for drivers. These appear in order fulfillment views.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Delivery Windows</p>
            <p className="text-xs text-gray-500">Add preferred arrival windows to keep logistics aligned.</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={addWindow}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            + Add window
          </button>
        </div>

        {values.deliveryWindows?.length ? (
          <div className="mt-3 space-y-3">
            {values.deliveryWindows.map((window, index) => (
              <div key={`window-${index}`} className="rounded-md border border-gray-200 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <select
                    value={window.type}
                    disabled={disabled}
                    onChange={(event) =>
                      updateWindow(index, {
                        type: event.target.value as DeliveryWindow["type"],
                        ...(event.target.value === "BETWEEN"
                          ? { startTime: window.startTime ?? "09:00", endTime: window.endTime ?? "12:00" }
                          : event.target.value === "BEFORE"
                          ? { time: window.time ?? "09:00", startTime: undefined, endTime: undefined }
                          : { time: window.time ?? "17:00", startTime: undefined, endTime: undefined }),
                      })
                    }
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {DELIVERY_WINDOW_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type === "BEFORE" && "Before"}
                        {type === "AFTER" && "After"}
                        {type === "BETWEEN" && "Between"}
                      </option>
                    ))}
                  </select>

                  {window.type === "BETWEEN" ? (
                    <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-500" htmlFor={`window-start-${index}`}>
                          Start
                        </label>
                        <input
                          id={`window-start-${index}`}
                          type="time"
                          disabled={disabled}
                          value={window.startTime}
                          onChange={(event) => updateWindow(index, { startTime: event.target.value })}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-500" htmlFor={`window-end-${index}`}>
                          End
                        </label>
                        <input
                          id={`window-end-${index}`}
                          type="time"
                          disabled={disabled}
                          value={window.endTime}
                          onChange={(event) => updateWindow(index, { endTime: event.target.value })}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-500" htmlFor={`window-time-${index}`}>
                        Time
                      </label>
                      <input
                        id={`window-time-${index}`}
                        type="time"
                        disabled={disabled}
                        value={window.time}
                        onChange={(event) => updateWindow(index, { time: event.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeWindow(index)}
                    disabled={disabled}
                    className="text-sm text-rose-600 hover:text-rose-700 disabled:text-gray-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No preferred windows yet. Add one to help drivers plan.</p>
        )}

        {deliveryWindowSummary && (
          <p className="mt-2 text-xs text-gray-500">
            {deliveryWindowSummary}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="payment-method">
            Preferred Payment Method
          </label>
          <select
            id="payment-method"
            disabled={disabled}
            value={values.paymentMethod ?? ""}
            onChange={(event) => onChange({ paymentMethod: event.target.value || null })}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">-- Select method --</option>
            {paymentOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="delivery-method">
            Delivery Method
          </label>
          <select
            id="delivery-method"
            disabled={disabled}
            value={values.deliveryMethod ?? ""}
            onChange={(event) => onChange({ deliveryMethod: event.target.value || null })}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">-- Select method --</option>
            {deliveryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="Custom">Other / Custom</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="warehouse-origin">
          Warehouse Delivery Comes From
        </label>
        <input
          id="warehouse-origin"
          type="text"
          disabled={disabled}
          value={values.defaultWarehouseLocation ?? ""}
          onChange={(event) => onChange({ defaultWarehouseLocation: event.target.value || null })}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Example: Springfield Warehouse, Dock 4"
        />
      </div>
    </div>
  );
}
