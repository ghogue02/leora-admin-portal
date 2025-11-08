'use client';

/**
 * Territory Delivery Schedule Admin Page
 *
 * Allows admins to configure delivery days for each sales rep/territory
 * Travis’s requirement: Assign delivery dates for territories
 *
 * Features:
 * - List all sales reps with their territories
 * - Edit delivery days (Mon/Tue/Wed/Thu/Fri/Sat/Sun)
 * - Updates SalesRep.deliveryDaysArray
 * - Used by DeliveryDatePicker for validation
 */

import { useState, useEffect, useCallback } from 'react';

type SalesRep = {
  id: string;
  userId: string;
  territoryName: string;
  deliveryDaysArray: string[];
  user: {
    fullName: string;
    email: string;
  };
};

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function DeliverySchedulePage() {
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingDays, setEditingDays] = useState<string[]>([]);

  const loadSalesReps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sales/admin/sales-reps');
      if (!response.ok) throw new Error('Failed to load sales reps');

      const data = await response.json();
      setSalesReps(data.salesReps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales reps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSalesReps();
  }, [loadSalesReps]);

  const handleEdit = useCallback((rep: SalesRep) => {
    setEditingId(rep.id);
    setEditingDays(rep.deliveryDaysArray || []);
  }, []);

  const handleToggleDay = useCallback((day: string) => {
    setEditingDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  }, []);

  const handleSave = useCallback(async (repId: string) => {
    setSavingId(repId);
    setError(null);

    try {
      const response = await fetch(`/api/sales/admin/sales-reps/${repId}/delivery-days`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDays: editingDays,
        }),
      });

      if (!response.ok) throw new Error('Failed to update delivery days');

      // Reload sales reps to get fresh data
      await loadSalesReps();

      setEditingId(null);
      setEditingDays([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update delivery days');
    } finally {
      setSavingId(null);
    }
  }, [editingDays, loadSalesReps]);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setEditingDays([]);
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Territory Delivery Schedule</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure delivery days for each sales rep&rsquo;s territory. These are used to validate delivery dates when creating orders.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Error</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
        </div>
      ) : salesReps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No sales reps found</p>
          <p className="mt-1 text-sm text-gray-600">
            Create sales reps in the admin panel first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {salesReps.map(rep => {
            const isEditing = editingId === rep.id;
            const isSaving = savingId === rep.id;
            const currentDays = isEditing ? editingDays : (rep.deliveryDaysArray || []);

            return (
              <article
                key={rep.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {rep.user.fullName}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Territory: <strong>{rep.territoryName}</strong>
                    </p>
                    <p className="text-xs text-gray-500">{rep.user.email}</p>
                  </div>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => handleEdit(rep)}
                      className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Edit Schedule
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(rep.id)}
                        disabled={isSaving}
                        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                    Delivery Days
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = currentDays.includes(day);

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => isEditing && handleToggleDay(day)}
                          disabled={!isEditing}
                          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          } ${
                            !isEditing ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>

                  {currentDays.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      ⚠ No delivery days configured - orders will not have suggested dates
                    </p>
                  )}
                </div>

                {!isEditing && currentDays.length > 0 && (
                  <div className="mt-3 text-xs text-gray-600">
                    Delivers on: <strong>{currentDays.join(', ')}</strong>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
