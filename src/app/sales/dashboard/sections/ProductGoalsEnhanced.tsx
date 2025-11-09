'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Target,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Search,
} from 'lucide-react';
import {
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns';

export type MetricType = 'revenue' | 'cases' | 'pod';
export type PeriodType = 'week' | 'month' | 'quarter' | 'year';
export type PeriodScope = 'current' | 'previous';
export type GoalMode = 'category' | 'sku';

type ProductGoal = {
  id: string;
  skuId: string | null;
  productCategory: string | null;
  targetRevenue: number | null;
  targetCases: number | null;
  targetPod: number | null;
  metricType: MetricType;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  productName?: string;
  skuCode?: string;
  currentRevenue: number;
  currentCases: number;
  currentPod: number;
  progressPercent: number;
};

type GoalFormData = {
  mode: GoalMode;
  productCategory: string;
  skuId: string | null;
  metricType: MetricType;
  targetRevenue: string;
  targetCases: string;
  targetPod: string;
  periodType: PeriodType;
  periodScope: PeriodScope;
};

type SkuOption = {
  id: string;
  label: string;
  code: string;
  brand?: string | null;
  name?: string | null;
  category?: string | null;
};

const metricLabels: Record<MetricType, string> = {
  revenue: 'Revenue',
  cases: 'Cases',
  pod: 'Points of Distribution',
};

const periodLabels: Record<PeriodType, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

function getCurrentPeriodRange(periodType: PeriodType) {
  const now = new Date();
  switch (periodType) {
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'quarter':
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
      };
    case 'year':
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };
    case 'month':
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
  }
}

function derivePeriodScope(goal: ProductGoal): PeriodScope {
  const { start } = getCurrentPeriodRange(goal.periodType);
  const goalEnd = new Date(goal.periodEnd);
  return goalEnd < start ? 'previous' : 'current';
}

function formatPeriod(goal: ProductGoal) {
  const scope = derivePeriodScope(goal);
  const rangeLabel = scope === 'current' ? 'This' : 'Last';
  const descriptor = `${rangeLabel} ${periodLabels[goal.periodType]}`;
  const start = new Date(goal.periodStart).toLocaleDateString();
  const end = new Date(goal.periodEnd).toLocaleDateString();
  return `${descriptor} • ${start} - ${end}`;
}

function formatMetric(goal: ProductGoal) {
  if (goal.metricType === 'revenue') {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);

    return {
      current: formatCurrency(goal.currentRevenue ?? 0),
      target: formatCurrency(goal.targetRevenue ?? 0),
    };
  }

  if (goal.metricType === 'cases') {
    return {
      current: `${goal.currentCases ?? 0} cases`,
      target: `${goal.targetCases ?? 0} cases`,
    };
  }

  return {
    current: `${goal.currentPod ?? 0} POD`,
    target: `${goal.targetPod ?? 0} POD`,
  };
}

export default function ProductGoalsEnhanced() {
  const [goals, setGoals] = useState<ProductGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ProductGoal | null>(null);

  useEffect(() => {
    void loadGoals();
  }, []);

  async function loadGoals() {
    try {
      setLoading(true);
      setError(null);
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
        <p className="text-xs text-slate-500">
          See which focus items are pacing ahead or falling behind before month-end surprises.
        </p>
        <button
          onClick={() => {
            setEditingGoal(null);
            setShowModal(true);
          }}
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
        {goals.map((goal) => {
          const metricValues = formatMetric(goal);
          return (
            <div key={goal.id} className={`rounded-lg border p-4 ${getProgressBgColor(goal.progressPercent)}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-900">
                      {goal.productName || goal.productCategory || 'Product Goal'}
                    </h4>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {metricLabels[goal.metricType]}
                    </span>
                  </div>
                  {goal.skuCode && (
                    <p className="text-xs text-gray-600">SKU: {goal.skuCode}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">{formatPeriod(goal)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingGoal(goal);
                      setShowModal(true);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDeleteGoal(goal.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-md border border-gray-200 bg-white/70 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Current vs Target</span>
                  <span className="font-semibold text-gray-900">
                    {metricValues.current} / {metricValues.target}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full transition-all ${getProgressColor(goal.progressPercent)}`}
                    style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                  />
                </div>
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
          );
        })}

        {goals.length === 0 && (
          <div className="py-12 text-center">
            <Target className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No product goals set</p>
            <button
              onClick={() => {
                setEditingGoal(null);
                setShowModal(true);
              }}
              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Create your first goal
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <GoalModal
          goal={editingGoal}
          onClose={() => {
            setShowModal(false);
            setEditingGoal(null);
          }}
          onSave={async () => {
            await loadGoals();
            setShowModal(false);
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
    mode: 'category',
    productCategory: '',
    skuId: null,
    metricType: 'revenue',
    targetRevenue: '',
    targetCases: '',
    targetPod: '',
    periodType: 'month',
    periodScope: 'current',
  });
  const [saving, setSaving] = useState(false);
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuLoading, setSkuLoading] = useState(false);

  useEffect(() => {
    if (goal) {
      setFormData({
        mode: goal.skuId ? 'sku' : 'category',
        productCategory: goal.productCategory || '',
        skuId: goal.skuId,
        metricType: goal.metricType ?? 'revenue',
        targetRevenue: goal.targetRevenue != null ? String(goal.targetRevenue) : '',
        targetCases: goal.targetCases != null ? String(goal.targetCases) : '',
        targetPod: goal.targetPod != null ? String(goal.targetPod) : '',
        periodType: goal.periodType ?? 'month',
        periodScope: derivePeriodScope(goal),
      });
    } else {
      setFormData({
        mode: 'category',
        productCategory: '',
        skuId: null,
        metricType: 'revenue',
        targetRevenue: '',
        targetCases: '',
        targetPod: '',
        periodType: 'month',
        periodScope: 'current',
      });
    }
  }, [goal]);

  useEffect(() => {
    if (formData.mode !== 'sku') return;

    let active = true;
    async function loadSkus() {
      try {
        setSkuLoading(true);
        const params = new URLSearchParams({
          limit: '50',
        });
        if (skuSearch.trim()) {
          params.set('search', skuSearch.trim());
        }
        const response = await fetch(`/api/sales/catalog/skus?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Failed to load SKUs');
        }
        const data = await response.json();
        if (!active) return;
        const options: SkuOption[] = (data.skus || []).map((sku: any) => ({
          id: sku.id,
          label: `${sku.product?.brand ?? ''} ${sku.product?.name ?? ''}`.trim() || sku.code,
          code: sku.code,
          brand: sku.product?.brand,
          name: sku.product?.name,
          category: sku.product?.category,
        }));
        setSkuOptions(options);
      } catch (err) {
        console.error('Failed to fetch SKUs', err);
      } finally {
        if (active) {
          setSkuLoading(false);
        }
      }
    }

    void loadSkus();

    return () => {
      active = false;
    };
  }, [formData.mode, skuSearch]);

  const selectedSku = useMemo(() => {
    const option = skuOptions.find((opt) => opt.id === formData.skuId);
    if (option) return option;
    if (goal && goal.skuId && goal.skuId === formData.skuId) {
      return {
        id: goal.skuId,
        label: goal.productName || goal.skuCode || 'Selected SKU',
        code: goal.skuCode ?? '',
        brand: undefined,
        name: goal.productName,
        category: goal.productCategory,
      } satisfies SkuOption;
    }
    return undefined;
  }, [skuOptions, formData.skuId, goal]);

  useEffect(() => {
    if (goal && goal.skuCode && formData.mode === 'sku') {
      setSkuSearch(goal.skuCode);
    }
  }, [goal, formData.mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = goal
        ? `/api/sales/dashboard/product-goals/${goal.id}`
        : '/api/sales/dashboard/product-goals';

      const payload: Record<string, unknown> = {
        metricType: formData.metricType,
        periodType: formData.periodType,
        periodScope: formData.periodScope,
      };

      if (formData.mode === 'sku') {
        if (!formData.skuId) {
          alert('Please select a SKU for this goal.');
          setSaving(false);
          return;
        }
        payload.skuId = formData.skuId;
        payload.productCategory = null;
      } else {
        if (!formData.productCategory.trim()) {
          alert('Please provide a product category.');
          setSaving(false);
          return;
        }
        payload.productCategory = formData.productCategory.trim();
        payload.skuId = null;
      }

      if (formData.metricType === 'revenue') {
        if (!formData.targetRevenue || Number(formData.targetRevenue) <= 0) {
          alert('Target revenue must be greater than zero.');
          setSaving(false);
          return;
        }
        payload.targetRevenue = Number(formData.targetRevenue);
      } else if (formData.metricType === 'cases') {
        if (!formData.targetCases || Number(formData.targetCases) <= 0) {
          alert('Target cases must be greater than zero.');
          setSaving(false);
          return;
        }
        payload.targetCases = Number(formData.targetCases);
      } else {
        if (!formData.targetPod || Number(formData.targetPod) <= 0) {
          alert('Target Points of Distribution must be greater than zero.');
          setSaving(false);
          return;
        }
        payload.targetPod = Number(formData.targetPod);
      }

      const response = await fetch(url, {
        method: goal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        className="w-full max-w-xl space-y-5 rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {goal ? 'Edit Product Goal' : 'Create Product Goal'}
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Type</label>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  className="h-4 w-4"
                  checked={formData.mode === 'category'}
                  onChange={() => setFormData((prev) => ({
                    ...prev,
                    mode: 'category',
                    skuId: null,
                  }))}
                />
                Product Category
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  className="h-4 w-4"
                  checked={formData.mode === 'sku'}
                  onChange={() => setFormData((prev) => ({
                    ...prev,
                    mode: 'sku',
                  }))}
                />
                Specific SKU
              </label>
            </div>
          </div>

          {formData.mode === 'category' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Product Category</label>
              <input
                type="text"
                value={formData.productCategory}
                onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="e.g., Red Wine, Spirits"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Select SKU</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-9 py-2 text-sm"
                    placeholder="Search by SKU code, product, or brand"
                  />
                </div>
                <select
                  value={formData.skuId ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      skuId: e.target.value || null,
                    }))
                  }
                  className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select SKU</option>
                  {skuOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.code} — {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {skuLoading && <p className="text-xs text-gray-500">Loading SKUs...</p>}
              {selectedSku && (
                <p className="text-xs text-gray-500">
                  {selectedSku.brand ? `${selectedSku.brand} • ` : ''}
                  {selectedSku.name} {selectedSku.category ? `• ${selectedSku.category}` : ''}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Metric</label>
              <select
                value={formData.metricType}
                onChange={(e) => {
                  const nextMetric = e.target.value as MetricType;
                  setFormData((prev) => ({
                    ...prev,
                    metricType: nextMetric,
                    targetRevenue: nextMetric === 'revenue' ? prev.targetRevenue : '',
                    targetCases: nextMetric === 'cases' ? prev.targetCases : '',
                    targetPod: nextMetric === 'pod' ? prev.targetPod : '',
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="revenue">Revenue</option>
                <option value="cases">Cases</option>
                <option value="pod">Points of Distribution</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Period</label>
              <select
                value={formData.periodType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    periodType: e.target.value as PeriodType,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Period Scope</label>
            <select
              value={formData.periodScope}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  periodScope: e.target.value as PeriodScope,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="current">Current Period</option>
              <option value="previous">Last Completed Period</option>
            </select>
          </div>

          {formData.metricType === 'revenue' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Revenue</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.targetRevenue}
                onChange={(e) =>
                  setFormData({ ...formData, targetRevenue: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="10000"
              />
            </div>
          )}

          {formData.metricType === 'cases' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Cases</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.targetCases}
                onChange={(e) =>
                  setFormData({ ...formData, targetCases: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="50"
              />
            </div>
          )}

          {formData.metricType === 'pod' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Points of Distribution</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.targetPod}
                onChange={(e) =>
                  setFormData({ ...formData, targetPod: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="25"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
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
            {saving ? 'Saving...' : goal ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
}

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
