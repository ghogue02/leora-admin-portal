"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerClassificationFields } from "@/components/customers/CustomerClassificationFields";
import { CustomerBasicInfoFields } from "@/components/customers/forms/CustomerBasicInfoFields";
import { CustomerAddressFields } from "@/components/customers/forms/CustomerAddressFields";
import { useCustomerDetail } from "@/hooks/useCustomerDetail";
import type {
  CustomerType,
  FeatureProgram,
  VolumeCapacity,
} from "@/types/customer";

type CustomerEditClientProps = {
  customerId: string;
};

type ContactFormState = {
  name: string;
  accountNumber: string;
  billingEmail: string;
  phone: string;
  paymentTerms: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
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
  paymentTerms: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
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

  useEffect(() => {
    if (data?.customer) {
      setContactForm({
        name: data.customer.name ?? "",
        accountNumber: data.customer.accountNumber ?? "",
        billingEmail: data.customer.billingEmail ?? "",
        phone: data.customer.phone ?? "",
        paymentTerms: data.customer.paymentTerms ?? "",
        street1: data.customer.address.street1 ?? "",
        street2: data.customer.address.street2 ?? "",
        city: data.customer.address.city ?? "",
        state: data.customer.address.state ?? "",
        postalCode: data.customer.address.postalCode ?? "",
        country: data.customer.address.country ?? "US",
      });

      setClassification({
        type: (data.customer.type as CustomerType | null) ?? "",
        volumeCapacity: (data.customer.volumeCapacity as VolumeCapacity | null) ?? "",
        featurePrograms: (data.customer.featurePrograms as FeatureProgram[]) ?? [],
      });
    }
  }, [data?.customer]);

  const handleContactChange = (field: keyof ContactFormState, value: string | null) => {
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
      const payload = {
        name: contactForm.name.trim(),
        accountNumber: contactForm.accountNumber.trim() || null,
        billingEmail: contactForm.billingEmail.trim() || null,
        phone: contactForm.phone.trim() || null,
        paymentTerms: contactForm.paymentTerms.trim() || null,
        street1: contactForm.street1.trim() || null,
        street2: contactForm.street2.trim() || null,
        city: contactForm.city.trim() || null,
        state: contactForm.state.trim() || null,
        postalCode: contactForm.postalCode.trim() || null,
        country: contactForm.country.trim() || null,
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
                  accountNumber: contactForm.accountNumber,
                  billingEmail: contactForm.billingEmail,
                  phone: contactForm.phone,
                  paymentTerms: contactForm.paymentTerms,
                }}
                onChange={(field, value) =>
                  handleContactChange(field as keyof ContactFormState, value)
                }
                disabled={saving}
              />
            </section>

            <section className="mt-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Location & Territory</h2>
                <p className="text-sm text-gray-500">Keep delivery information accurate.</p>
              </div>
              <CustomerAddressFields
                values={{
                  street1: contactForm.street1,
                  street2: contactForm.street2,
                  city: contactForm.city,
                  state: contactForm.state,
                  postalCode: contactForm.postalCode,
                  country: contactForm.country,
                }}
                onChange={(field, value) =>
                  handleContactChange(field as keyof ContactFormState, value)
                }
                disabled={saving}
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
