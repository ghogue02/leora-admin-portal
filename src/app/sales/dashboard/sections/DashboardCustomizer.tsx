'use client';

import { useEffect, useState } from 'react';
import { Settings, Eye, EyeOff, X } from 'lucide-react';

export type DashboardSection = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

export type DashboardPreferences = {
  sections: DashboardSection[];
};

export const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: 'performance-metrics', name: 'Performance Metrics', description: 'Weekly quota, revenue, and customer counts', enabled: true },
  { id: 'top-products', name: 'Top Products', description: 'Best-selling products by revenue', enabled: true },
  { id: 'customer-health', name: 'Customer Health Summary', description: 'Health status of your customers', enabled: true },
  { id: 'customer-balances', name: 'Customer Balances', description: 'Past due invoices and aging', enabled: true },
  { id: 'new-customers', name: 'New Customers', description: 'First-time buyers this week/month', enabled: true },
  { id: 'product-goals', name: 'Product Goals', description: 'Track progress toward sales goals', enabled: true },
  { id: 'revenue-chart', name: 'Weekly Revenue Chart', description: 'Visual revenue comparison', enabled: true },
  { id: 'customers-due', name: 'Customers Due to Order', description: 'Accounts that should be ordering soon', enabled: true },
  { id: 'upcoming-events', name: 'Upcoming Events', description: 'Calendar appointments and visits', enabled: true },
  { id: 'tasks', name: 'Tasks List', description: 'Your pending tasks and follow-ups', enabled: true },
];

export default function DashboardCustomizer({
  onPreferencesChange,
  sections: controlledSections,
}: {
  onPreferencesChange?: (prefs: DashboardPreferences) => void;
  sections?: DashboardSection[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [sections, setSections] = useState<DashboardSection[]>(controlledSections ?? DEFAULT_SECTIONS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (controlledSections) {
      setSections(controlledSections);
    }
  }, [controlledSections]);

  async function savePreferences() {
    setSaving(true);

    try {
      const response = await fetch('/api/sales/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      const prefs = { sections };
      onPreferencesChange?.(prefs);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  function toggleSection(sectionId: string) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section
      )
    );
  }

  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        <Settings className="h-4 w-4" />
        Customize Dashboard
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Customize Dashboard</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Show or hide sections ({enabledCount} of {sections.length} visible)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 p-6">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition ${
                    section.enabled
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                    {section.enabled ? (
                      <Eye className="h-5 w-5 text-blue-600" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold ${section.enabled ? 'text-blue-900' : 'text-gray-700'}`}>
                      {section.name}
                    </h3>
                    <p className={`text-sm ${section.enabled ? 'text-blue-600' : 'text-gray-500'}`}>
                      {section.description}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`relative inline-block h-6 w-11 rounded-full transition ${
                        section.enabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${
                          section.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
