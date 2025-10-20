'use client';

import { useCallback, useEffect, useState } from "react";

type Address = {
  id: string;
  label: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: string;
};

type ApiError = {
  error?: string;
};

type AddressFormState = {
  label: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const initialForm: AddressFormState = {
  label: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
  isDefault: false,
};

export default function AddressManager() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/portal/addresses", { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(body.error ?? "Unable to load addresses.");
      }
      const data = (await response.json()) as { addresses: Address[] };
      setAddresses(data.addresses);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load addresses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const handleChange = (key: keyof AddressFormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/portal/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label.trim() || undefined,
          street1: form.street1.trim(),
          street2: form.street2.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
          isDefault: form.isDefault,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(body.error ?? "Unable to create address.");
      }

      await loadAddresses();
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to create address.");
    } finally {
      setSubmitting(false);
    }
  };

  const markDefault = async (id: string) => {
    setError(null);
    try {
      const response = await fetch("/api/portal/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: id, isDefault: true }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(body.error ?? "Unable to update address.");
      }
      await loadAddresses();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to update address.");
    }
  };

  const deleteAddress = async (id: string) => {
    if (!window.confirm("Remove this address?")) {
      return;
    }

    setError(null);
    try {
      const response = await fetch("/api/portal/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: id }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(body.error ?? "Unable to delete address.");
      }
      await loadAddresses();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to delete address.");
    }
  };

  return (
    <div className="space-y-6" id="addresses">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Addresses</h2>
        <p className="text-sm text-gray-600">
          Maintain shipping addresses used during ordering. Mark a default to pre-fill checkout
          forms.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-md border border-dashed border-gray-300 p-4">
        <p className="text-sm font-medium text-gray-700">Add a new address</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Label
            <input
              type="text"
              value={form.label}
              onChange={(event) => handleChange("label", event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              placeholder="Primary"
              disabled={submitting}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => handleChange("isDefault", event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              disabled={submitting}
            />
            Set as default
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Street 1
          <input
            required
            type="text"
            value={form.street1}
            onChange={(event) => handleChange("street1", event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            placeholder="123 Main St"
            disabled={submitting}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          Street 2
          <input
            type="text"
            value={form.street2}
            onChange={(event) => handleChange("street2", event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            placeholder="Suite 200"
            disabled={submitting}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            City
            <input
              required
              type="text"
              value={form.city}
              onChange={(event) => handleChange("city", event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              disabled={submitting}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            State / Province
            <input
              required
              type="text"
              value={form.state}
              onChange={(event) => handleChange("state", event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              disabled={submitting}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Postal code
            <input
              required
              type="text"
              value={form.postalCode}
              onChange={(event) => handleChange("postalCode", event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              disabled={submitting}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Country
            <input
              required
              type="text"
              value={form.country}
              onChange={(event) => handleChange("country", event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              disabled={submitting}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-fit items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save address"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Saved addresses</p>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No addresses yet.</p>
        ) : (
          <ul className="space-y-3">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="flex flex-col gap-2 rounded-md border border-gray-200 px-3 py-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{address.label || "Address"}</p>
                    <div className="text-xs text-gray-600">
                      <p>{address.street1}</p>
                      {address.street2 ? <p>{address.street2}</p> : null}
                      <p>
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p>{address.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!address.isDefault ? (
                      <button
                        type="button"
                        onClick={() => void markDefault(address.id)}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                      >
                        Make default
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Default
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => void deleteAddress(address.id)}
                      className="rounded-md border border-transparent px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
