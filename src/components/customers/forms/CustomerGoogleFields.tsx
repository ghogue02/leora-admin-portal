"use client";

import clsx from "clsx";

type GoogleFieldsValues = {
  website: string | null;
  googlePlaceId: string | null;
  googlePlaceName: string | null;
  googleFormattedAddress: string | null;
  internationalPhone: string | null;
  googleMapsUrl: string | null;
  googleBusinessStatus: string | null;
  googlePlaceTypes: string[];
};

type CustomerGoogleFieldsProps = {
  values: GoogleFieldsValues;
  onChange: (field: keyof Omit<GoogleFieldsValues, "googlePlaceTypes">, value: string | null) => void;
  onTypesChange: (types: string[]) => void;
  disabled?: boolean;
};

export function CustomerGoogleFields({
  values,
  onChange,
  onTypesChange,
  disabled = false,
}: CustomerGoogleFieldsProps) {
  const typesAsString = values.googlePlaceTypes.join(", ");

  const handleTypesInput = (input: string) => {
    const parsed = input
      .split(",")
      .map((value) => value.trim())
      .filter((value, index, arr) => value.length && arr.indexOf(value) === index);
    onTypesChange(parsed);
  };

  const buildInput = (
    key: keyof Omit<GoogleFieldsValues, "googlePlaceTypes">,
    label: string,
    options: { placeholder?: string; helperText?: string; textarea?: boolean } = {}
  ) => {
    const commonProps = {
      id: `customer-${key}`,
      disabled,
      value: values[key] ?? "",
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange(key, event.target.value || null),
      className: clsx(
        "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
        disabled && "bg-gray-50"
      ),
      placeholder: options.placeholder,
    };

    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700" htmlFor={commonProps.id}>
          {label}
        </label>
        {options.textarea ? (
          <textarea {...commonProps} rows={3} />
        ) : (
          <input type="text" {...commonProps} />
        )}
        {options.helperText && <p className="mt-1 text-xs text-gray-500">{options.helperText}</p>}
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {buildInput("googlePlaceName", "Google Place Name")}
        {buildInput("googlePlaceId", "Google Place ID", {
          helperText: "Useful for deduping or refreshing data later.",
        })}
      </div>

      {buildInput("googleFormattedAddress", "Google Formatted Address", { textarea: true })}

      <div className="grid gap-4 md:grid-cols-2">
        {buildInput("website", "Website", { placeholder: "https://example.com" })}
        {buildInput("internationalPhone", "International Phone", { placeholder: "+1 555-123-4567" })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {buildInput("googleMapsUrl", "Google Maps URL", {
          helperText: "Use Google’s share link for quick access.",
        })}
        {buildInput("googleBusinessStatus", "Google Business Status", {
          helperText: "E.g., OPERATIONAL, CLOSED_TEMPORARILY.",
        })}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700" htmlFor="customer-googlePlaceTypes">
          Place Types
        </label>
        <textarea
          id="customer-googlePlaceTypes"
          disabled={disabled}
          value={typesAsString}
          onChange={(event) => handleTypesInput(event.target.value)}
          className={clsx(
            "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
            disabled && "bg-gray-50"
          )}
          placeholder="restaurant, bar, point_of_interest"
          rows={2}
        />
        <p className="mt-1 text-xs text-gray-500">Comma-separated list from Google (optional).</p>
      </div>
    </section>
  );
}
