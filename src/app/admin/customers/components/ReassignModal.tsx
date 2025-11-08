'use client';

import { useState, useEffect } from 'react';

interface SalesRep {
  id: string;
  territoryName: string;
  user: {
    fullName: string;
    email: string;
  };
}

interface ReassignModalProps {
  customerId: string;
  customerName: string;
  currentSalesRep: {
    id: string;
    name: string;
    email: string;
    territoryName: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReassignModal({
  customerId,
  customerName,
  currentSalesRep,
  isOpen,
  onClose,
  onSuccess,
}: ReassignModalProps) {
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSalesReps();
    }
  }, [isOpen]);

  const fetchSalesReps = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Create this endpoint
      const response = await fetch('/api/admin/sales-reps');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sales reps');
      }

      setSalesReps(data.salesReps || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales reps');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRepId) {
      alert('Please select a sales rep');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newSalesRepId: selectedRepId,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reassign customer');
      }

      alert('Customer reassigned successfully');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reassign customer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Reassign Customer</h2>

        {/* Current Assignment */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Current Assignment</h3>
          <div className="text-sm">
            <div>Customer: <span className="font-medium">{customerName}</span></div>
            {currentSalesRep ? (
              <>
                <div>Sales Rep: <span className="font-medium">{currentSalesRep.name}</span></div>
                <div>Email: <span className="text-gray-600">{currentSalesRep.email}</span></div>
                <div>Territory: <span className="text-gray-600">{currentSalesRep.territoryName}</span></div>
              </>
            ) : (
              <div className="text-gray-500">No sales rep currently assigned</div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* New Sales Rep Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              New Sales Representative <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="text-gray-500">Loading sales reps...</div>
            ) : (
              <select
                required
                value={selectedRepId}
                onChange={(e) => setSelectedRepId(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select a sales rep</option>
                {salesReps.map(rep => (
                  <option key={rep.id} value={rep.id}>
                    {rep.user.fullName} - {rep.territoryName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Rep Info */}
          {selectedRepId && salesReps.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold mb-2">New Assignment</h4>
              {(() => {
                const selectedRep = salesReps.find(r => r.id === selectedRepId);
                return selectedRep ? (
                  <div className="text-sm">
                    <div>Sales Rep: <span className="font-medium">{selectedRep.user.fullName}</span></div>
                    <div>Email: <span className="text-gray-600">{selectedRep.user.email}</span></div>
                    <div>Territory: <span className="text-gray-600">{selectedRep.territoryName}</span></div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">
              Reason for Reassignment
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter reason for this reassignment (optional)"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !selectedRepId}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-6 py-3 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
