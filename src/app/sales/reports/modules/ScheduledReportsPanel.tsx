'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../_components/ToastProvider';

type ScheduledReport = {
  id: string;
  name: string;
  description: string | null;
  reportType: string;
  frequency: string;
  dayOfWeek: number | null;
  timeOfDay: string;
  recipientEmail: string;
  isActive: boolean;
  lastSentAt: string | null;
  nextScheduled: string | null;
  createdAt: string;
};

const REPORT_TYPES = [
  { value: 'DAILY_BRIEFING', label: 'Daily Briefing', description: 'Top 5 insights from your day' },
  { value: 'WEEKLY_PERFORMANCE', label: 'Weekly Performance', description: 'Your week in numbers' },
  { value: 'TERRITORY_HEALTH', label: 'Territory Health', description: 'Customer risk & opportunity report' },
  { value: 'CUSTOM_QUERY', label: 'Custom Query', description: 'Run a saved query on schedule' },
];

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function ScheduledReportsPanel() {
  const { pushToast } = useToast();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reportType: 'DAILY_BRIEFING',
    frequency: 'DAILY',
    dayOfWeek: 1,
    timeOfDay: '08:00',
    recipientEmail: '',
  });

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sales/leora/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      pushToast({
        tone: 'error',
        title: 'Loading error',
        description: 'Failed to load scheduled reports',
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleCreateReport = async () => {
    if (!formData.name || !formData.recipientEmail) {
      pushToast({
        tone: 'error',
        title: 'Validation error',
        description: 'Name and email are required',
      });
      return;
    }

    try {
      const response = await fetch('/api/sales/leora/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dayOfWeek: formData.frequency === 'WEEKLY' ? formData.dayOfWeek : null,
        }),
      });

      if (response.ok) {
        pushToast({
          tone: 'success',
          title: 'Report scheduled',
          description: `"${formData.name}" will be sent ${formData.frequency.toLowerCase()}`,
        });
        setShowCreateDialog(false);
        setFormData({
          name: '',
          description: '',
          reportType: 'DAILY_BRIEFING',
          frequency: 'DAILY',
          dayOfWeek: 1,
          timeOfDay: '08:00',
          recipientEmail: '',
        });
        loadReports();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create report');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not schedule report';
      pushToast({
        tone: 'error',
        title: 'Creation failed',
        description: message,
      });
    }
  };

  const handleToggleActive = async (reportId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/sales/leora/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (response.ok) {
        pushToast({
          tone: 'success',
          title: currentActive ? 'Report paused' : 'Report activated',
          description: currentActive ? 'Report will not be sent' : 'Report will resume sending',
        });
        loadReports();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update report';
      pushToast({
        tone: 'error',
        title: 'Update failed',
        description: message,
      });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sales/leora/reports/${reportId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        pushToast({
          tone: 'success',
          title: 'Report deleted',
          description: 'Scheduled report has been removed',
        });
        loadReports();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete report';
      pushToast({
        tone: 'error',
        title: 'Delete failed',
        description: message,
      });
    }
  };

  if (loading) {
    return (
      <div className="surface-card p-6 shadow-sm">
        <p className="text-sm text-gray-600">Loading scheduled reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-col gap-3 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Automated report delivery</h2>
          <p className="text-sm text-gray-600">
            Email the latest dashboards to managers, reps, or ops on autopilot.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="touch-target inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          + New schedule
        </button>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="surface-card p-8 text-center shadow-sm">
            <p className="text-sm text-gray-600">
              No scheduled reports yet. Create one to get insights delivered to your inbox!
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className={`surface-card p-4 shadow-sm transition ${
                report.isActive ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{report.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        report.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {report.isActive ? 'Active' : 'Paused'}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {REPORT_TYPES.find((t) => t.value === report.reportType)?.label ||
                        report.reportType}
                    </span>
                  </div>
                  {report.description && (
                    <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      📧 {report.recipientEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      🔄 {report.frequency.charAt(0) + report.frequency.slice(1).toLowerCase()}
                      {report.frequency === 'WEEKLY' && report.dayOfWeek !== null && (
                        <> on {DAY_OPTIONS[report.dayOfWeek].label}</>
                      )}
                    </span>
                    <span className="flex items-center gap-1">🕐 {report.timeOfDay}</span>
                  </div>
                  {report.nextScheduled && (
                    <p className="mt-2 text-xs text-gray-500">
                      Next: {new Date(report.nextScheduled).toLocaleString()}
                    </p>
                  )}
                  {report.lastSentAt && (
                    <p className="text-xs text-gray-500">
                      Last sent: {new Date(report.lastSentAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => handleToggleActive(report.id, report.isActive)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                      report.isActive
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {report.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Schedule New Report</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="My Daily Briefing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Report Type *</label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency *</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              {formData.frequency === 'WEEKLY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Day of Week *</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) =>
                      setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {DAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Time of Day *</label>
                <input
                  type="time"
                  value={formData.timeOfDay}
                  onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address *</label>
                <input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="What will this report help you with?"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setFormData({
                    name: '',
                    description: '',
                    reportType: 'DAILY_BRIEFING',
                    frequency: 'DAILY',
                    dayOfWeek: 1,
                    timeOfDay: '08:00',
                    recipientEmail: '',
                  });
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReport}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Schedule Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
