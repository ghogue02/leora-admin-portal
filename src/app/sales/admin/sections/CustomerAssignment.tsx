"use client";

import { useState, useEffect } from "react";

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
    fetchData();
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          salesRepId: selectedRepId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign customer");
      }

      setSuccessMessage(
        `Successfully assigned ${selectedCustomer.name} to ${
          reps.find((r) => r.id === selectedRepId)?.user.fullName
        }`
      );

      // Reset form and refresh data
      setSelectedCustomer(null);
      setSelectedRepId("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.accountNumber?.toLowerCase().includes(searchLower) ||
      customer.salesRep?.user.fullName.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Customer Assignment</h2>
        <p className="mt-1 text-sm text-gray-600">
          Assign or reassign customers to sales representatives
        </p>
      </div>

      {/* Assignment Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Customer</h3>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Customer
            </label>
            <select
              value={selectedCustomer?.id || ""}
              onChange={(e) => {
                const customer = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(customer || null);
                setError(null);
                setSuccessMessage(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.accountNumber && ` (${customer.accountNumber})`}
                </option>
              ))}
            </select>
            {selectedCustomer?.salesRep && (
              <p className="mt-2 text-sm text-gray-600">
                Currently assigned to: {selectedCustomer.salesRep.user.fullName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Representative
            </label>
            <select
              value={selectedRepId}
              onChange={(e) => {
                setSelectedRepId(e.target.value);
                setError(null);
                setSuccessMessage(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <button
              onClick={handleAssignCustomer}
              disabled={!selectedCustomer || !selectedRepId || isSaving}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Assigning..." : "Assign Customer"}
            </button>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search customers by name, account, or rep..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Rep
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {customer.accountNumber || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {customer.city && customer.state
                        ? `${customer.city}, ${customer.state}`
                        : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {customer.salesRep ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.salesRep.user.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.salesRep.territoryName}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setSelectedRepId(customer.salesRepId || "");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Reassign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No customers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
