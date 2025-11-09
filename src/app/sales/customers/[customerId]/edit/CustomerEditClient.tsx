"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerClassificationFields } from "@/components/customers/CustomerClassificationFields";
import { CustomerBasicInfoFields } from "@/components/customers/forms/CustomerBasicInfoFields";
import { CustomerAddressFields } from "@/components/customers/forms/CustomerAddressFields";
import { CustomerDeliveryFields } from "@/components/customers/forms/CustomerDeliveryFields";
import { CustomerGoogleFields } from "@/components/customers/forms/CustomerGoogleFields";
import { GoogleMapsAutoFill } from "@/components/customers/GoogleMapsAutoFill";
import { useCustomerDetail } from "@/hooks/useCustomerDetail";
import type { GooglePlaceSuggestion } from "@/lib/maps/googlePlaces";
import { CustomerContactsManager } from "@/components/customers/CustomerContactsManager";
import type {
  CustomerType,
  FeatureProgram,
  VolumeCapacity,
  DeliveryWindow,
} from "@/types/customer";

type CustomerEditClientProps = {
  customerId: string;
};

type ContactFormState = {
  name: string;
  accountNumber: string;
  billingEmail: string;
  phone: string;
  internationalPhone: string;
  paymentTerms: string;
  licenseNumber: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  deliveryInstructions: string;
  deliveryMethod: string;
  paymentMethod: string;
  defaultWarehouseLocation: string;
  deliveryWindows: DeliveryWindow[];
  website: string;
  googlePlaceId: string;
  googlePlaceName: string;
  googleFormattedAddress: string;
  googleMapsUrl: string;
  googleBusinessStatus: string;
  googlePlaceTypes: string[];
};

type ClassificationState = {
  type: CustomerType | "";
  volumeCapacity: VolumeCapacity | "";
  featurePrograms: FeatureProgram[];
};

const blankContactState: ContactFormState = {
  name: "",
  accountNumber: "",
  billingEmail: "",
  phone: "",
  internationalPhone: "",
  paymentTerms: "",
  licenseNumber: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  deliveryInstructions: "",
  deliveryMethod: "",
  paymentMethod: "",
  defaultWarehouseLocation: "",
  deliveryWindows: [],
  website: "",
  googlePlaceId: "",
  googlePlaceName: "",
  googleFormattedAddress: "",
  googleMapsUrl: "",
  googleBusinessStatus: "",
  googlePlaceTypes: [],
};

const blankClassificationState: ClassificationState = {
  type: "",
  volumeCapacity: "",
  featurePrograms: [],
};

export default function CustomerEditClient({ customerId }: CustomerEditClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useCustomerDetail(customerId);
  const [contactForm, setContactForm] = useState<ContactFormState>(blankContactState);
  const [classification, setClassification] = useState<ClassificationState>(
    blankClassificationState
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const applyGoogleSuggestion = (
    suggestion: GooglePlaceSuggestion,
    { overwriteExisting }: { overwriteExisting: boolean }
  ) => {
    setContactForm((prev) => {
      const applyField = (currentValue: string, nextValue?: string | null) => {
        if (!nextValue) {
          return currentValue;
        }
        if (overwriteExisting || !currentValue.trim()) {
          return nextValue;
        }
        return currentValue;
      };
      const applyArray = (currentValues: string[], nextValues?: string[] | null) => {
        if (!nextValues || nextValues.length === 0) {
          return currentValues;
        }
        if (overwriteExisting || currentValues.length === 0) {
          return nextValues;
        }
        return currentValues;
      };
      const phone = suggestion.phoneNumber ?? suggestion.internationalPhoneNumber ?? "";
      const address = suggestion.address ?? null;

      return {
        ...prev,
        name: applyField(prev.name, suggestion.name ?? null),
        phone: phone ? applyField(prev.phone, phone) : prev.phone,
        internationalPhone: suggestion.internationalPhoneNumber
          ? applyField(prev.internationalPhone, suggestion.internationalPhoneNumber)
          : prev.internationalPhone,
        street1: applyField(prev.street1, address?.street1 ?? null),
        city: applyField(prev.city, address?.city ?? null),
        state: applyField(prev.state, address?.state ?? null),
        postalCode: applyField(prev.postalCode, address?.postalCode ?? null),
        country: applyField(prev.country, address?.country ?? null),
        website: applyField(prev.website, suggestion.website ?? null),
        googlePlaceId: applyField(prev.googlePlaceId, suggestion.placeId ?? null),
        googlePlaceName: applyField(prev.googlePlaceName, suggestion.name ?? null),
        googleFormattedAddress: applyField(prev.googleFormattedAddress, suggestion.formattedAddress ?? null),
        googleMapsUrl: applyField(prev.googleMapsUrl, suggestion.googleMapsUrl ?? null),
        googleBusinessStatus: applyField(prev.googleBusinessStatus, suggestion.businessStatus ?? null),
        googlePlaceTypes: applyArray(prev.googlePlaceTypes, suggestion.types ?? null),
      };
    });
  };

  useEffect(() => {
    if (data?.customer) {
      setContactForm({
        name: data.customer.name ?? "",
        accountNumber: data.customer.accountNumber ?? "",
        billingEmail: data.customer.billingEmail ?? "",
        phone: data.customer.phone ?? "",
        internationalPhone: data.customer.internationalPhone ?? "",
        paymentTerms: data.customer.paymentTerms ?? "",
        licenseNumber: data.customer.licenseNumber ?? "",
        street1: data.customer.address.street1 ?? "",
        street2: data.customer.address.street2 ?? "",
        city: data.customer.address.city ?? "",
        state: data.customer.address.state ?? "",
        postalCode: data.customer.address.postalCode ?? "",
        country: data.customer.address.country ?? "US",
        deliveryInstructions: data.customer.deliveryInstructions ?? "",
        deliveryMethod: data.customer.deliveryMethod ?? "",
        paymentMethod: data.customer.paymentMethod ?? "",
        defaultWarehouseLocation: data.customer.defaultWarehouseLocation ?? "",
        deliveryWindows: Array.isArray(data.customer.deliveryWindows)
          ? (data.customer.deliveryWindows as DeliveryWindow[])
          : [],
        website: data.customer.website ?? "",
        googlePlaceId: data.customer.googlePlaceId ?? "",
        googlePlaceName: data.customer.googlePlaceName ?? "",
        googleFormattedAddress: data.customer.googleFormattedAddress ?? "",
        googleMapsUrl: data.customer.googleMapsUrl ?? "",
        googleBusinessStatus: data.customer.googleBusinessStatus ?? "",
        googlePlaceTypes: data.customer.googlePlaceTypes ?? [],
      });

      setClassification({
        type: (data.customer.type as CustomerType | null) ?? "",
        volumeCapacity: (data.customer.volumeCapacity as VolumeCapacity | null) ?? "",
        featurePrograms: (data.customer.featurePrograms as FeatureProgram[]) ?? [],
      });
    }
  }, [data?.customer]);

  type ContactStringField = Exclude<keyof ContactFormState, "deliveryWindows" | "googlePlaceTypes">;

  const handleContactChange = (field: ContactStringField, value: string | null) => {
    setContactForm((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
  };

  const handleSave = async () => {
    if (!contactForm.name.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const normalize = (value: string) => value.trim() || null;
      const normalizedTypes = contactForm.googlePlaceTypes
        .map((value) => value.trim())
        .filter((value, index, arr) => value.length && arr.indexOf(value) === index);

      const payload = {
        name: contactForm.name.trim(),
        accountNumber: normalize(contactForm.accountNumber),
        billingEmail: normalize(contactForm.billingEmail),
        phone: normalize(contactForm.phone),
        internationalPhone: normalize(contactForm.internationalPhone),
        paymentTerms: normalize(contactForm.paymentTerms),
        licenseNumber: normalize(contactForm.licenseNumber),
        street1: normalize(contactForm.street1),
        street2: normalize(contactForm.street2),
        city: normalize(contactForm.city),
        state: normalize(contactForm.state),
        postalCode: normalize(contactForm.postalCode),
        country: normalize(contactForm.country),
        deliveryInstructions: normalize(contactForm.deliveryInstructions),
        deliveryMethod: normalize(contactForm.deliveryMethod),
        paymentMethod: normalize(contactForm.paymentMethod),
        defaultWarehouseLocation: normalize(contactForm.defaultWarehouseLocation),
        deliveryWindows: contactForm.deliveryWindows,
        website: normalize(contactForm.website),
        googlePlaceId: normalize(contactForm.googlePlaceId),
        googlePlaceName: normalize(contactForm.googlePlaceName),
        googleFormattedAddress: normalize(contactForm.googleFormattedAddress),
        googleMapsUrl: normalize(contactForm.googleMapsUrl),
        googleBusinessStatus: normalize(contactForm.googleBusinessStatus),
        googlePlaceTypes: normalizedTypes,
        type: classification.type || null,
        volumeCapacity: classification.volumeCapacity || null,
        featurePrograms: classification.featurePrograms,
      };

      const response = await fetch(`/api/sales/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save changes");
      }

      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      router.push(`/sales/customers/${customerId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-900">Unable to load customer</h1>
          <p className="mt-2 text-sm text-red-700">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Link
            href={`/sales/customers/${customerId}`}
            className="mt-4 inline-flex text-sm font-medium text-red-900 hover:underline"
          >
            Back to customer
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            Customer Profile
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">Edit Customer Details</h1>
          <p className="mt-1 text-sm text-gray-500">
            Keep contact info, delivery details, and analytics fields in sync.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/sales/customers/${customerId}`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isLoading}
            className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading || !data ? (
          <div className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
            <div className="h-24 animate-pulse rounded bg-slate-100" />
            <div className="h-24 animate-pulse rounded bg-slate-100" />
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Auto-fill with Google Maps</h2>
              <GoogleMapsAutoFill
                variant="sales"
                customerId={customerId}
                defaultQuery={contactForm.name}
                onApply={applyGoogleSuggestion}
              />
            </section>

            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                <p className="text-sm text-gray-500">
                  Update contact and account details shared with operations.
                </p>
              </div>
              <CustomerBasicInfoFields
                values={{
                  name: contactForm.name,
                  accountNumber: contactForm.accountNumber || null,
                  billingEmail: contactForm.billingEmail || null,
                  phone: contactForm.phone || null,
                  paymentTerms: contactForm.paymentTerms || null,
                  licenseNumber: contactForm.licenseNumber || null,
                }}
                onChange={(field, value) =>
                  handleContactChange(field as ContactStringField, value)
                }
                disabled={saving}
              />
            </section>

            <section className="mt-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Google Maps Metadata</h2>
                <p className="text-sm text-gray-500">Store the Google IDs and canonical contact info we pull in.</p>
              </div>
              <CustomerGoogleFields
                values={{
                  website: contactForm.website || null,
                  googlePlaceId: contactForm.googlePlaceId || null,
                  googlePlaceName: contactForm.googlePlaceName || null,
                  googleFormattedAddress: contactForm.googleFormattedAddress || null,
                  internationalPhone: contactForm.internationalPhone || null,
                  googleMapsUrl: contactForm.googleMapsUrl || null,
                  googleBusinessStatus: contactForm.googleBusinessStatus || null,
                  googlePlaceTypes: contactForm.googlePlaceTypes,
                }}
                disabled={saving}
                onChange={(field, value) =>
                  handleContactChange(field as ContactStringField, value)
                }
                onTypesChange={(types) =>
                  setContactForm((prev) => ({ ...prev, googlePlaceTypes: types }))
                }
              />
            </section>

            <section className="mt-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Location & Territory</h2>
                <p className="text-sm text-gray-500">Keep delivery information accurate.</p>
              </div>
              <CustomerAddressFields
                values={{
                  street1: contactForm.street1 || null,
                  street2: contactForm.street2 || null,
                  city: contactForm.city || null,
                  state: contactForm.state || null,
                  postalCode: contactForm.postalCode || null,
                  country: contactForm.country || null,
                }}
                onChange={(field, value) =>
                  handleContactChange(field as ContactStringField, value)
                }
                disabled={saving}
              />
            </section>

            <section className="mt-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delivery Preferences</h2>
                <p className="text-sm text-gray-500">
                  Capture handling instructions, time windows, and preferred payment logistics.
                </p>
              </div>
          <CustomerDeliveryFields
            values={{
              deliveryInstructions: contactForm.deliveryInstructions || null,
              deliveryWindows: contactForm.deliveryWindows,
              paymentMethod: contactForm.paymentMethod || null,
              deliveryMethod: contactForm.deliveryMethod || null,
              defaultWarehouseLocation: contactForm.defaultWarehouseLocation || null,
            }}
            disabled={saving}
            onChange={(updates) =>
              setContactForm((prev) => ({
                ...prev,
                ...(updates as Partial<ContactFormState>),
              }))
            }
          />
            </section>

            <section className="mt-8">
              <CustomerClassificationFields
                typeValue={classification.type}
                volumeCapacityValue={classification.volumeCapacity}
                featureProgramsValue={classification.featurePrograms}
                onTypeChange={(value) =>
                  setClassification((prev) => ({ ...prev, type: value }))
                }
                onVolumeCapacityChange={(value) =>
                  setClassification((prev) => ({ ...prev, volumeCapacity: value }))
                }
                onFeatureProgramsChange={(programs) =>
                  setClassification((prev) => ({ ...prev, featurePrograms: programs }))
                }
                disabled={saving}
              />
            </section>

            <section className="mt-8 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Key Contacts</h2>
                <p className="text-sm text-gray-500">
                  Track buyers, sommeliers, and managers linked to this account.
                </p>
              </div>
              <CustomerContactsManager
                customerId={customerId}
                initialContacts={data.contacts ?? []}
                variant="sales"
              />
            </section>
          </>
        )}

        {formError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}
      </div>
    </main>
  );
}
