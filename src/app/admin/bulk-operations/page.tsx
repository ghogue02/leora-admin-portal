'use client';

import { useState, useEffect } from 'react';
import { parseCSV } from '@/lib/csv-parser';

interface SalesRep {
  id: string;
  name: string;
  email: string;
  territory: string;
}

interface Customer {
  id: string;
  name: string;
  accountNumber: string | null;
  salesRep: { id: string; name: string } | null;
  territory: string | null;
}

interface Order {
  id: string;
  customer: { name: string };
  status: string;
  total: number;
  orderedAt: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  isActive?: boolean;
  status?: string;
  roles: Array<{ role: { id: string; name: string; code: string } }>;
}

interface Role {
  id: string;
  name: string;
  code: string;
}

export default function BulkOperationsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Section 1: Customer Reassignment
  const [reassignMode, setReassignMode] = useState<'list' | 'csv'>('list');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [targetSalesRepId, setTargetSalesRepId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [csvFileCustomers, setCsvFileCustomers] = useState<File | null>(null);
  const [reassignResults, setReassignResults] = useState<any>(null);
  const [reassignLoading, setReassignLoading] = useState(false);

  // Section 2: Inventory Adjustment
  const [inventoryCsvFile, setInventoryCsvFile] = useState<File | null>(null);
  const [inventoryPreview, setInventoryPreview] = useState<any[]>([]);
  const [inventoryResults, setInventoryResults] = useState<any>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Section 3: Order Status Change
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('');
  const [orderReason, setOrderReason] = useState('');
  const [orderResults, setOrderResults] = useState<any>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  // Section 4: User Management
  const [userType, setUserType] = useState<'internal' | 'portal'>('internal');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userAction, setUserAction] = useState<'activate' | 'deactivate' | 'addRole' | 'removeRole'>('activate');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [userResults, setUserResults] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(false);

  // Fetch sales reps
  useEffect(() => {
    fetchSalesReps();
    fetchRoles();
  }, []);

  const fetchSalesReps = async () => {
    try {
      const response = await fetch('/api/admin/sales-reps');
      const data = await response.json();
      if (response.ok) {
        setSalesReps(data.salesReps || []);
      }
    } catch (error) {
      console.error('Error fetching sales reps:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      if (response.ok) {
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (customerSearch) params.append('search', customerSearch);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/customers?${params}`);
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (orderSearch) params.append('search', orderSearch);
      if (orderStatusFilter) params.append('status', orderStatusFilter);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/orders?${params}`);
      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const endpoint = userType === 'internal'
        ? '/api/admin/accounts/users'
        : '/api/admin/accounts/portal-users';

      const params = new URLSearchParams();
      if (userSearch) params.append('search', userSearch);
      params.append('limit', '100');

      const response = await fetch(`${endpoint}?${params}`);
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || data.portalUsers || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCustomerReassignment = async () => {
    if (!targetSalesRepId) {
      alert('Please select a target sales rep');
      return;
    }

    if (reassignMode === 'list' && selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    if (reassignMode === 'csv' && !csvFileCustomers) {
      alert('Please upload a CSV file');
      return;
    }

    if (!confirm(`Are you sure you want to reassign ${reassignMode === 'list' ? selectedCustomers.length : 'the CSV'} customer(s)?`)) {
      return;
    }

    setReassignLoading(true);
    setReassignResults(null);

    try {
      let csvData = null;
      if (reassignMode === 'csv' && csvFileCustomers) {
        csvData = await csvFileCustomers.text();
      }

      const response = await fetch('/api/admin/bulk-operations/reassign-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerIds: reassignMode === 'list' ? selectedCustomers : undefined,
          csvData,
          salesRepId: targetSalesRepId,
          reason: reassignReason
        })
      });

      const result = await response.json();

      if (response.ok) {
        setReassignResults(result);
        setSelectedCustomers([]);
        setCsvFileCustomers(null);
        alert(`Success! ${result.successCount} customers reassigned.`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setReassignLoading(false);
    }
  };

  const handleInventoryAdjustment = async () => {
    if (!inventoryCsvFile) {
      alert('Please upload a CSV file');
      return;
    }

    if (!confirm(`Are you sure you want to process ${inventoryPreview.length} inventory adjustment(s)?`)) {
      return;
    }

    setInventoryLoading(true);
    setInventoryResults(null);

    try {
      const csvData = await inventoryCsvFile.text();

      const response = await fetch('/api/admin/bulk-operations/adjust-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData })
      });

      const result = await response.json();

      if (response.ok) {
        setInventoryResults(result);
        setInventoryCsvFile(null);
        setInventoryPreview([]);
        alert(`Success! ${result.successCount} adjustments completed.`);
      } else {
        alert(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleOrderStatusChange = async () => {
    if (selectedOrders.length === 0) {
      alert('Please select at least one order');
      return;
    }

    if (!newOrderStatus) {
      alert('Please select a new status');
      return;
    }

    if (!confirm(`Are you sure you want to change status for ${selectedOrders.length} order(s) to ${newOrderStatus}?`)) {
      return;
    }

    setOrderLoading(true);
    setOrderResults(null);

    try {
      const response = await fetch('/api/admin/bulk-operations/change-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedOrders,
          newStatus: newOrderStatus,
          reason: orderReason
        })
      });

      const result = await response.json();

      if (response.ok) {
        setOrderResults(result);
        setSelectedOrders([]);
        alert(`Success! ${result.successCount} orders updated.`);
        fetchOrders(); // Refresh list
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setOrderLoading(false);
    }
  };

  const handleUserManagement = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    if ((userAction === 'addRole' || userAction === 'removeRole') && !selectedRoleId) {
      alert('Please select a role');
      return;
    }

    if (!confirm(`Are you sure you want to ${userAction} for ${selectedUsers.length} user(s)?`)) {
      return;
    }

    setUserLoading(true);
    setUserResults(null);

    try {
      const response = await fetch('/api/admin/bulk-operations/manage-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers,
          userType,
          action: userAction,
          roleId: selectedRoleId || undefined
        })
      });

      const result = await response.json();

      if (response.ok) {
        setUserResults(result);
        setSelectedUsers([]);
        alert(`Success! ${result.successCount} users updated.`);
        fetchUsers(); // Refresh list
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setUserLoading(false);
    }
  };

  const handleInventoryCsvUpload = async (file: File) => {
    setInventoryCsvFile(file);
    try {
      const text = await file.text();
      const parsed = parseCSV(text, {
        validateHeaders: ['skuCode', 'location', 'adjustmentType', 'quantity', 'reason']
      });

      if (parsed.errors.length > 0) {
        alert(`CSV errors:\n${parsed.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n')}`);
        setInventoryPreview([]);
      } else {
        setInventoryPreview(parsed.rows);
      }
    } catch (error: any) {
      alert(`Error parsing CSV: ${error.message}`);
    }
  };

  const downloadTemplate = (type: 'customer' | 'inventory') => {
    const url = type === 'customer'
      ? '/api/admin/templates/customer-reassignment'
      : '/api/admin/templates/inventory-adjustment';

    window.open(url, '_blank');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bulk Operations</h1>
        <p className="text-gray-600 mt-2">Perform operations on multiple records at once</p>
      </div>

      <div className="grid gap-6">
        {/* Section 1: Bulk Customer Reassignment */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Bulk Customer Reassignment</h2>
              <p className="text-gray-600 text-sm">Reassign multiple customers to a different territory or sales rep</p>
            </div>
            <button
              onClick={() => setActiveSection(activeSection === 'reassign' ? null : 'reassign')}
              className="text-blue-600 hover:text-blue-800"
            >
              {activeSection === 'reassign' ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {activeSection === 'reassign' && (
            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={reassignMode === 'list'}
                    onChange={() => setReassignMode('list')}
                    className="mr-2"
                  />
                  Select from list
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={reassignMode === 'csv'}
                    onChange={() => setReassignMode('csv')}
                    className="mr-2"
                  />
                  Upload CSV
                </label>
              </div>

              {reassignMode === 'list' ? (
                <div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="border rounded px-3 py-2 flex-1"
                    />
                    <button
                      onClick={fetchCustomers}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Search
                    </button>
                  </div>

                  <div className="border rounded max-h-64 overflow-y-auto">
                    {customers.map((customer) => (
                      <label key={customer.id} className="flex items-center p-2 hover:bg-gray-50 border-b">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomers([...selectedCustomers, customer.id]);
                            } else {
                              setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            {customer.accountNumber} - Current rep: {customer.salesRep?.name || 'Unassigned'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">{selectedCustomers.length} selected</div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => downloadTemplate('customer')}
                    className="text-blue-600 hover:underline text-sm mb-2"
                  >
                    Download CSV Template
                  </button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFileCustomers(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {csvFileCustomers && (
                    <div className="text-sm text-green-600 mt-2">File: {csvFileCustomers.name}</div>
                  )}
                </div>
              )}

              {/* Target Sales Rep */}
              <div>
                <label className="block font-medium mb-1">Target Sales Rep</label>
                <select
                  value={targetSalesRepId}
                  onChange={(e) => setTargetSalesRepId(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Select sales rep...</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} - {rep.territory}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-medium mb-1">Reason (optional)</label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  rows={2}
                />
              </div>

              {/* Execute Button */}
              <button
                onClick={handleCustomerReassignment}
                disabled={reassignLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {reassignLoading ? 'Processing...' : 'Execute Reassignment'}
              </button>

              {/* Results */}
              {reassignResults && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <h3 className="font-semibold text-green-800">Results</h3>
                  <p>Success: {reassignResults.successCount}</p>
                  <p>Errors: {reassignResults.errorCount}</p>
                  {reassignResults.errors && reassignResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="text-sm">
                        {reassignResults.errors.slice(0, 10).map((err: any, i: number) => (
                          <li key={i}>{err.customerName}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Bulk Inventory Adjustment */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Bulk Inventory Adjustment</h2>
              <p className="text-gray-600 text-sm">Adjust inventory levels for multiple SKUs at once</p>
            </div>
            <button
              onClick={() => setActiveSection(activeSection === 'inventory' ? null : 'inventory')}
              className="text-blue-600 hover:text-blue-800"
            >
              {activeSection === 'inventory' ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {activeSection === 'inventory' && (
            <div className="space-y-4">
              <button
                onClick={() => downloadTemplate('inventory')}
                className="text-blue-600 hover:underline text-sm"
              >
                Download CSV Template
              </button>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleInventoryCsvUpload(file);
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />

              {inventoryPreview.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Preview ({inventoryPreview.length} adjustments)</h3>
                  <div className="border rounded max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left">SKU</th>
                          <th className="px-2 py-1 text-left">Location</th>
                          <th className="px-2 py-1 text-left">Type</th>
                          <th className="px-2 py-1 text-left">Qty</th>
                          <th className="px-2 py-1 text-left">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryPreview.slice(0, 20).map((row: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1">{row.skuCode}</td>
                            <td className="px-2 py-1">{row.location}</td>
                            <td className="px-2 py-1">{row.adjustmentType}</td>
                            <td className="px-2 py-1">{row.quantity}</td>
                            <td className="px-2 py-1">{row.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={handleInventoryAdjustment}
                disabled={inventoryLoading || inventoryPreview.length === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {inventoryLoading ? 'Processing...' : 'Execute Adjustments'}
              </button>

              {inventoryResults && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <h3 className="font-semibold text-green-800">Results</h3>
                  <p>Success: {inventoryResults.successCount}</p>
                  <p>Errors: {inventoryResults.errorCount}</p>
                  {inventoryResults.errors && inventoryResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="text-sm">
                        {inventoryResults.errors.slice(0, 10).map((err: any, i: number) => (
                          <li key={i}>{err.skuCode} @ {err.location}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Bulk Order Status Change */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Bulk Order Status Change</h2>
              <p className="text-gray-600 text-sm">Change status for multiple orders at once</p>
            </div>
            <button
              onClick={() => setActiveSection(activeSection === 'orders' ? null : 'orders')}
              className="text-blue-600 hover:text-blue-800"
            >
              {activeSection === 'orders' ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {activeSection === 'orders' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="border rounded px-3 py-2 flex-1"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="FULFILLED">FULFILLED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <button
                  onClick={fetchOrders}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Search
                </button>
              </div>

              <div className="border rounded max-h-64 overflow-y-auto">
                {orders.map((order) => (
                  <label key={order.id} className="flex items-center p-2 hover:bg-gray-50 border-b">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders([...selectedOrders, order.id]);
                        } else {
                          setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                        }
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{order.id}</div>
                      <div className="text-sm text-gray-600">
                        {order.customer.name} - {order.status} - ${Number(order.total).toFixed(2)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="text-sm text-gray-600">{selectedOrders.length} selected</div>

              <div>
                <label className="block font-medium mb-1">New Status</label>
                <select
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Select status...</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="FULFILLED">FULFILLED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Reason (optional)</label>
                <textarea
                  value={orderReason}
                  onChange={(e) => setOrderReason(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  rows={2}
                />
              </div>

              <button
                onClick={handleOrderStatusChange}
                disabled={orderLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {orderLoading ? 'Processing...' : 'Execute Status Change'}
              </button>

              {orderResults && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <h3 className="font-semibold text-green-800">Results</h3>
                  <p>Success: {orderResults.successCount}</p>
                  <p>Errors: {orderResults.errorCount}</p>
                  {orderResults.errors && orderResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="text-sm">
                        {orderResults.errors.slice(0, 10).map((err: any, i: number) => (
                          <li key={i}>{err.orderId}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Bulk User Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Bulk User Management</h2>
              <p className="text-gray-600 text-sm">Activate, deactivate, or assign roles to multiple users</p>
            </div>
            <button
              onClick={() => setActiveSection(activeSection === 'users' ? null : 'users')}
              className="text-blue-600 hover:text-blue-800"
            >
              {activeSection === 'users' ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {activeSection === 'users' && (
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={userType === 'internal'}
                    onChange={() => {
                      setUserType('internal');
                      setUsers([]);
                      setSelectedUsers([]);
                    }}
                    className="mr-2"
                  />
                  Internal Users
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={userType === 'portal'}
                    onChange={() => {
                      setUserType('portal');
                      setUsers([]);
                      setSelectedUsers([]);
                    }}
                    className="mr-2"
                  />
                  Portal Users
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="border rounded px-3 py-2 flex-1"
                />
                <button
                  onClick={fetchUsers}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Search
                </button>
              </div>

              <div className="border rounded max-h-64 overflow-y-auto">
                {users.map((user) => {
                  const isActive = userType === 'internal' ? user.isActive : user.status === 'ACTIVE';
                  return (
                    <label key={user.id} className="flex items-center p-2 hover:bg-gray-50 border-b">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-gray-600">
                          {user.email} - {isActive ? 'Active' : 'Inactive'} - Roles: {user.roles.map(r => r.role.name).join(', ')}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="text-sm text-gray-600">{selectedUsers.length} selected</div>

              <div>
                <label className="block font-medium mb-1">Action</label>
                <select
                  value={userAction}
                  onChange={(e) => setUserAction(e.target.value as any)}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="activate">Activate</option>
                  <option value="deactivate">Deactivate</option>
                  <option value="addRole">Add Role</option>
                  <option value="removeRole">Remove Role</option>
                </select>
              </div>

              {(userAction === 'addRole' || userAction === 'removeRole') && (
                <div>
                  <label className="block font-medium mb-1">Role</label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="">Select role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} ({role.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleUserManagement}
                disabled={userLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {userLoading ? 'Processing...' : 'Execute User Management'}
              </button>

              {userResults && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <h3 className="font-semibold text-green-800">Results</h3>
                  <p>Success: {userResults.successCount}</p>
                  <p>Errors: {userResults.errorCount}</p>
                  {userResults.errors && userResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="text-sm">
                        {userResults.errors.slice(0, 10).map((err: any, i: number) => (
                          <li key={i}>{err.userName}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
