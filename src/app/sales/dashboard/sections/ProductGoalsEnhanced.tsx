'use client';

import { useEffect, useState } from 'react';
import { Target, TrendingUp, Plus, Edit, Trash2 } from 'lucide-react';

type ProductGoal = {
  id: string;
  skuId: string | null;
  productCategory: string | null;
  targetRevenue: number | null;
  targetCases: number | null;
  periodStart: string;
  periodEnd: string;
  productName?: string;
  skuCode?: string;
  currentRevenue: number;
  currentCases: number;
  progressPercent: number;
};

type GoalFormData = {
  skuId?: string;
  productCategory?: string;
  targetRevenue?: number;
  targetCases?: number;
  periodType: 'week' | 'month';
};

export default function ProductGoalsEnhanced() {
  const [goals, setGoals] = useState<ProductGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ProductGoal | null>(null);

  useEffect(() => {
    void loadGoals();
  }, []);

  async function loadGoals() {
    try {
      setLoading(true);
      const response = await fetch('/api/sales/dashboard/product-goals', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load product goals');
      }

      const result = await response.json();
      setGoals(result.goals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGoal(goalId: string) {
    if (!confirm('Delete this goal?')) return;

    try {
      const response = await fetch(`/api/sales/dashboard/product-goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      await loadGoals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete goal');
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  function getProgressColor(percent: number): string {
    if (percent >= 100) return 'bg-green-600';
    if (percent >= 75) return 'bg-yellow-500';
    if (percent >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  }

  function getProgressBgColor(percent: number): string {
    if (percent >= 100) return 'border-green-200 bg-green-50';
    if (percent >= 75) return 'border-yellow-200 bg-yellow-50';
    if (percent >= 50) return 'border-orange-200 bg-orange-50';
    return 'border-red-200 bg-red-50';
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Product Goals</h3>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Product Goals</h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className={`rounded-lg border p-4 ${getProgressBgColor(goal.progressPercent)}`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-gray-900">
                  {goal.productName || goal.productCategory || 'Product Goal'}
                </h4>
                {goal.skuCode && (
                  <p className="text-xs text-gray-600">SKU: {goal.skuCode}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(goal.periodStart).toLocaleDateString()} - {new Date(goal.periodEnd).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingGoal(goal)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {goal.targetRevenue && (
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(goal.currentRevenue)} / {formatCurrency(goal.targetRevenue)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all ${getProgressColor(goal.progressPercent)}`}
                      style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {goal.targetCases && (
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Cases</span>
                    <span className="font-semibold text-gray-900">
                      {goal.currentCases} / {goal.targetCases}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all ${getProgressColor(goal.progressPercent)}`}
                      style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Progress</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{goal.progressPercent.toFixed(0)}%</span>
                {goal.progressPercent >= 100 && (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
          </div>
        ))}

        {goals.length === 0 && (
          <div className="py-12 text-center">
            <Target className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No product goals set</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Create your first goal
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingGoal) && (
        <GoalModal
          goal={editingGoal}
          onClose={() => {
            setShowAddModal(false);
            setEditingGoal(null);
          }}
          onSave={async () => {
            await loadGoals();
            setShowAddModal(false);
            setEditingGoal(null);
          }}
        />
      )}
    </section>
  );
}

function GoalModal({
  goal,
  onClose,
  onSave,
}: {
  goal: ProductGoal | null;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [formData, setFormData] = useState<GoalFormData>({
    periodType: 'week',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = goal
        ? `/api/sales/dashboard/product-goals/${goal.id}`
        : '/api/sales/dashboard/product-goals';

      const response = await fetch(url, {
        method: goal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save goal');
      }

      await onSave();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h3 className="text-xl font-semibold text-gray-900">
          {goal ? 'Edit Goal' : 'Create Product Goal'}
        </h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Product Category</label>
            <input
              type="text"
              value={formData.productCategory || ''}
              onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="e.g., Red Wine, Spirits"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Target Revenue</label>
            <input
              type="number"
              value={formData.targetRevenue || ''}
              onChange={(e) => setFormData({ ...formData, targetRevenue: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="10000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Target Cases</label>
            <input
              type="number"
              value={formData.targetCases || ''}
              onChange={(e) => setFormData({ ...formData, targetCases: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Period</label>
            <select
              value={formData.periodType}
              onChange={(e) => setFormData({ ...formData, periodType: e.target.value as 'week' | 'month' })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="week">This Month</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Goal'}
          </button>
        </div>
      </form>
    </div>
  );
}
