"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveCard,
  ResponsiveCardDescription,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
} from "@/components/ui/responsive-card";
import { ResponsiveTable } from "@/components/ui/responsive-table";

type SalesRep = {
  id: string;
  territoryName: string;
  user: {
    fullName: string;
  };
};

type Customer = {
  id: string;
  name: string;
  accountNumber: string | null;
  city: string | null;
  state: string | null;
  salesRepId: string | null;
  salesRep: {
    id: string;
    territoryName: string;
    user: {
      fullName: string;
    };
  } | null;
};

export default function CustomerAssignment() {
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [repsResponse, customersResponse] = await Promise.all([
        fetch("/api/sales/admin/reps"),
        fetch("/api/sales/admin/assignments"),
      ]);

      if (!repsResponse.ok || !customersResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const repsData = await repsResponse.json();
      const customersData = await customersResponse.json();

      setReps(repsData.reps || []);
      setCustomers(customersData.customers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignCustomer = async () => {
    if (!selectedCustomer || !selectedRepId) {
      setError("Please select both a customer and a representative");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch("/api/sales/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          salesRepId: selectedRepId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign customer");
      }

      const repName = reps.find((r) => r.id === selectedRepId)?.user.fullName;
      setSuccessMessage(`Assigned ${selectedCustomer.name} to ${repName ?? "selected rep"}`);
      setSelectedCustomer(null);
      setSelectedRepId("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    if (!searchLower) return customers;
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.accountNumber?.toLowerCase().includes(searchLower) ||
        customer.salesRep?.user.fullName.toLowerCase().includes(searchLower)
      );
    });
  }, [customers, searchTerm]);

  if (isLoading) {
    return (
      <ResponsiveCard className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="h-24 rounded bg-slate-100" />
        <div className="h-40 rounded bg-slate-100" />
      </ResponsiveCard>
    );
  }

  return (
    <section className="layout-stack">
      <ResponsiveCard>
        <ResponsiveCardHeader>
          <ResponsiveCardTitle>Customer assignment</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Balance territories without leaving the responsive CRM shell.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>
        <p className="text-sm text-gray-600">
          Search for a customer, pick the right rep, and update assignments with touch-friendly
          controls.
        </p>
      </ResponsiveCard>

      <ResponsiveCard className="space-y-4">
        <ResponsiveCardHeader>
          <ResponsiveCardTitle>Assign customer</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Choose a customer + rep, then sync assignments in one tap.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select customer</label>
            <select
              value={selectedCustomer?.id ?? ""}
              onChange={(e) => {
                const customer = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(customer ?? null);
                setError(null);
                setSuccessMessage(null);
              }}
              className="touch-target w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.accountNumber ? ` (${customer.accountNumber})` : ""}
                </option>
              ))}
            </select>
            {selectedCustomer?.salesRep && (
              <p className="text-xs text-gray-500">
                Currently assigned to {selectedCustomer.salesRep.user.fullName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Assign to representative</label>
            <select
              value={selectedRepId}
              onChange={(e) => {
                setSelectedRepId(e.target.value);
                setError(null);
                setSuccessMessage(null);
              }}
              className="touch-target w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a rep...</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.user.fullName} - {rep.territoryName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              className="w-full touch-target"
              onClick={handleAssignCustomer}
              disabled={!selectedCustomer || !selectedRepId || isSaving}
            >
              {isSaving ? "Assigning..." : "Assign Customer"}
            </Button>
          </div>
        </div>
      </ResponsiveCard>

      <ResponsiveCard className="space-y-3">
        <ResponsiveCardHeader>
          <ResponsiveCardTitle>Customer list</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Filter by name, account number, or rep to find coverage gaps fast.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>
        <Input
          className="touch-target"
          placeholder="Search customers by name, account, or rep..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </ResponsiveCard>

      {filteredCustomers.length === 0 ? (
        <ResponsiveCard variant="muted">
          <p className="text-sm text-gray-600">No customers match that search.</p>
        </ResponsiveCard>
      ) : (
        <ResponsiveTable stickyHeader>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                {["Customer", "Account #", "Location", "Assigned Rep", "Actions"].map((heading) => (
                  <th key={heading} className="px-6 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {customer.accountNumber ?? "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {customer.city && customer.state ? `${customer.city}, ${customer.state}` : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {customer.salesRep ? (
                      <>
                        <span className="font-semibold">{customer.salesRep.user.fullName}</span>
                        <span className="block text-xs text-gray-500">
                          {customer.salesRep.territoryName}
                        </span>
                      </>
                    ) : (
                      <span className="italic text-gray-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      type="button"
                      className="text-blue-600 underline-offset-2 transition hover:text-blue-800 hover:underline"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setSelectedRepId(customer.salesRepId ?? "");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Reassign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      )}
    </section>
  );
}
