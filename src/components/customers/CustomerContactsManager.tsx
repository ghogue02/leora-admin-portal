"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showError, showSuccess } from "@/lib/toast-helpers";
import type { CustomerContact } from "@/types/customer";
import { BusinessCardScanner, BusinessCardScanResult } from "@/components/camera/BusinessCardScanner";

type CustomerContactsManagerProps = {
  customerId: string;
  initialContacts: CustomerContact[];
  variant: "sales" | "admin";
};

type ContactFormState = {
  fullName: string;
  role: string;
  phone: string;
  mobile: string;
  email: string;
  notes: string;
};

const API_PREFIX = {
  sales: "/api/sales/customers",
  admin: "/api/admin/customers",
} as const;

async function fileToBase64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeString(value: string) {
  const trimmed = value?.trim();
  return trimmed.length ? trimmed : null;
}

function base64ToFile(dataUrl: string, filename: string) {
  const arr = dataUrl.split(",");
  if (arr.length < 2) return null;
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i += 1) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  try {
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

export function CustomerContactsManager({
  customerId,
  initialContacts,
  variant,
}: CustomerContactsManagerProps) {
  const [contacts, setContacts] = useState<CustomerContact[]>(initialContacts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [formState, setFormState] = useState<ContactFormState>({
    fullName: "",
    role: "",
    phone: "",
    mobile: "",
    email: "",
    notes: "",
  });

  const apiBase = `${API_PREFIX[variant]}/${customerId}/contacts`;
  const placesEndpoint =
    variant === "sales"
      ? `/api/sales/customers/${customerId}/places`
      : `/api/admin/customers/${customerId}/places`;

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  const resetForm = () => {
    setFormState({
      fullName: "",
      role: "",
      phone: "",
      mobile: "",
      email: "",
      notes: "",
    });
    setBusinessCardFile(null);
  };

  const handleSubmit = async () => {
    if (!formState.fullName.trim()) {
      showError("Contact name is required.");
      return;
    }

    setSaving(true);
    try {
      let businessCardImage: string | undefined;
      if (businessCardFile) {
        businessCardImage = await fileToBase64(businessCardFile);
      }

      const response = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: sanitizeString(formState.fullName),
          role: sanitizeString(formState.role) ?? undefined,
          phone: sanitizeString(formState.phone) ?? undefined,
          mobile: sanitizeString(formState.mobile) ?? undefined,
          email: sanitizeString(formState.email) ?? undefined,
          notes: sanitizeString(formState.notes) ?? undefined,
          businessCardImage,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to save contact");
      }

      const payload = (await response.json()) as { contact: CustomerContact };
      setContacts((prev) => [payload.contact, ...prev]);
      showSuccess("Contact added", `${formState.fullName} is now linked to this account.`);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Remove this contact?")) {
      return;
    }

    setRemovingId(contactId);
    try {
      const response = await fetch(`${apiBase}/${contactId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to remove contact");
      }

      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
      showSuccess("Contact removed", "Contact is no longer associated with this customer.");
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Failed to remove contact");
    } finally {
      setRemovingId(null);
    }
  };

  const handleApplyScanResult = (result: BusinessCardScanResult) => {
    setFormState((prev) => ({
      ...prev,
      fullName: result.name ?? prev.fullName,
      email: result.email ?? prev.email,
      phone: result.phone ?? prev.phone,
      notes: result.company
        ? [prev.notes, `Company: ${result.company}`].filter(Boolean).join("\n")
        : prev.notes,
    }));
    showSuccess("Scan complete", "Contact details auto-filled from business card.");
  };

  const [applyMapsSuggestion, setApplyMapsSuggestion] = useState(false);

  const handleFetchFromMaps = async () => {
    setMapsLoading(true);
    try {
      const response = await fetch(placesEndpoint, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Google Maps lookup failed");
      }

      const payload = (await response.json()) as {
        suggestion: {
          formattedAddress: string | null;
          phoneNumber: string | null;
          internationalPhoneNumber: string | null;
          website: string | null;
          name: string | null;
          address?: {
            street1: string | null;
            city: string | null;
            state: string | null;
            postalCode: string | null;
            country: string | null;
          } | null;
        } | null;
      };

      if (!payload.suggestion) {
        showError("No Google Maps listing found for this customer.");
        return;
      }

      const { formattedAddress, phoneNumber, internationalPhoneNumber, website, name, address } = payload.suggestion;

      if (applyMapsSuggestion) {
        const updateEndpoint =
          variant === "sales"
            ? `/api/sales/customers/${customerId}`
            : `/api/admin/customers/${customerId}`;

        const phoneToApply = phoneNumber ?? internationalPhoneNumber;

        const updatePayload: Record<string, string> = {};
        if (phoneToApply) {
          updatePayload.phone = phoneToApply;
        }
        if (address?.street1) {
          updatePayload.street1 = address.street1;
        }
        if (address?.city) {
          updatePayload.city = address.city;
        }
        if (address?.state) {
          updatePayload.state = address.state;
        }
        if (address?.postalCode) {
          updatePayload.postalCode = address.postalCode;
        }
        if (address?.country) {
          updatePayload.country = address.country;
        }

        if (Object.keys(updatePayload).length > 0) {
          await fetch(updateEndpoint, {
            method: variant === "sales" ? "PATCH" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          })
            .then((res) => {
              if (!res.ok) {
                console.warn("Failed to persist Google Maps data to customer.");
              }
            })
            .catch(() => {
              // Non-blocking: continue even if update fails.
            });
        }
      }

      setFormState((prev) => ({
        ...prev,
        fullName: prev.fullName || name || "",
        phone: prev.phone || internationalPhoneNumber || phoneNumber || "",
        notes: [prev.notes, formattedAddress, website ? `Website: ${website}` : ""]
          .filter(Boolean)
          .join("\n"),
      }));

      showSuccess(
        "Google Maps data added",
        applyMapsSuggestion
          ? "Customer record updated with Maps phone/address."
          : "Phone and address fields updated from Google Maps."
      );
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : "Failed to fetch Google Maps data");
    } finally {
      setMapsLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Key Contacts</h2>
          <p className="text-xs text-gray-500">Track the people you work with inside the account.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
        >
          Add contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No contacts have been added yet. Use the button above to link buyers, sommeliers, or managers.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {contacts.map((contact) => (
            <li key={contact.id} className="rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{contact.fullName}</p>
                  {contact.role && <p className="text-sm text-gray-600">{contact.role}</p>}
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {contact.email && <p>Email: <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a></p>}
                    {contact.phone && <p>Phone: {contact.phone}</p>}
                    {contact.mobile && <p>Mobile: {contact.mobile}</p>}
                  </div>
                  {contact.notes && (
                    <p className="mt-2 rounded-md bg-slate-50 p-2 text-sm text-gray-700">{contact.notes}</p>
                  )}
                  {contact.businessCardUrl && (
                    <a
                      href={contact.businessCardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View business card
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(contact.id)}
                  disabled={removingId === contact.id}
                  className="self-start rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removingId === contact.id ? "Removing…" : "Remove"}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Added {new Date(contact.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Capture the buyer or staff member linked to this account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full name</label>
              <input
                type="text"
                value={formState.fullName}
                onChange={(event) => setFormState((prev) => ({ ...prev, fullName: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Jane Buyer"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <input
                  type="text"
                  value={formState.role}
                  onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="GM / Beverage Director"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formState.phone}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mobile</label>
                <input
                  type="tel"
                  value={formState.mobile}
                  onChange={(event) => setFormState((prev) => ({ ...prev, mobile: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Business card photo</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setBusinessCardFile(event.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional. Attach a photo of the card so the team can reference it later.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
              >
                Scan business card
              </button>
              <button
                type="button"
                onClick={handleFetchFromMaps}
                disabled={mapsLoading}
                className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mapsLoading ? "Fetching…" : "Fetch from Google Maps"}
              </button>
              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={applyMapsSuggestion}
                  onChange={(event) => setApplyMapsSuggestion(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Save phone/address to customer profile
              </label>
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Contact"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BusinessCardScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={(data) => {
          handleApplyScanResult(data);
          setIsScannerOpen(false);
        }}
        onImageCapture={(imageData) => {
          const file = base64ToFile(imageData, `business-card-${Date.now()}.jpg`);
          if (file) {
            setBusinessCardFile(file);
          }
        }}
      />
    </section>
  );
}
