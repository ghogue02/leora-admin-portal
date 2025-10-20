'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';

type Alert = {
  ruleId: string;
  name: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  count: number;
  hasFix: boolean;
};

type IntegrityData = {
  summary: {
    totalIssues: number;
    criticalIssues: number;
    qualityScore: number;
    lastChecked: string;
    cached: boolean;
  };
  alerts: Alert[];
};

export default function DataIntegrityDashboard() {
  const router = useRouter();
  const [data, setData] = useState<IntegrityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupInstructions, setSetupInstructions] = useState<string[]>([]);

  useEffect(() => {
    fetchIntegrityData();
  }, []);

  const fetchIntegrityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/data-integrity');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setSetupRequired(false);
      } else {
        // Check if setup is required (table doesn't exist)
        if (result.setupRequired) {
          setSetupRequired(true);
          setSetupInstructions(result.instructions || []);
          setError(result.message || 'Database setup required');
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching integrity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runFreshCheck = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const response = await fetch('/api/admin/data-integrity/run-check', {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        // Refresh the data
        await fetchIntegrityData();
      } else {
        // Check if setup is required (table doesn't exist)
        if (result.setupRequired) {
          setSetupRequired(true);
          setSetupInstructions(result.instructions || []);
          setError(result.message || 'Database setup required');
        } else {
          setError(result.error || 'Failed to run check');
        }
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error running check:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-5 h-5" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      case 'low':
        return <Info className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityScoreIcon = (score: number) => {
    if (score >= 90) return <TrendingUp className="w-6 h-6 text-green-600" />;
    return <TrendingDown className="w-6 h-6 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className={`border rounded-lg p-6 ${setupRequired ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`flex items-start gap-3 ${setupRequired ? 'text-yellow-800' : 'text-red-800'}`}>
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">
                {setupRequired ? 'Database Setup Required' : 'Error Loading Data Integrity'}
              </h3>
              <p className="mb-4">{error}</p>

              {setupRequired && setupInstructions.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-yellow-300">
                  <h4 className="font-medium mb-3">Setup Instructions:</h4>
                  <div className="space-y-2">
                    {setupInstructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-yellow-600 font-mono text-sm">{index + 1}.</span>
                        <code className="bg-gray-100 px-3 py-1 rounded text-sm flex-1">
                          {instruction}
                        </code>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> After running migrations, refresh this page to see data integrity status.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={fetchIntegrityData}
                className={`mt-4 px-4 py-2 rounded font-medium ${
                  setupRequired
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, alerts } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Integrity Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor and resolve data quality issues</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Quality Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Quality Score</span>
            {getQualityScoreIcon(summary.qualityScore)}
          </div>
          <div className={`text-3xl font-bold ${getQualityScoreColor(summary.qualityScore)}`}>
            {summary.qualityScore.toFixed(1)}%
          </div>
        </div>

        {/* Total Issues */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Issues</span>
            <AlertCircle className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalIssues}</div>
        </div>

        {/* Critical Issues */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Critical Issues</span>
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600">{summary.criticalIssues}</div>
        </div>

        {/* Last Checked */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Last Checked</span>
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div className="text-sm text-gray-900">
            {new Date(summary.lastChecked).toLocaleString()}
          </div>
          {summary.cached && (
            <span className="text-xs text-gray-500">(Cached)</span>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="mb-8">
        <button
          onClick={runFreshCheck}
          disabled={refreshing}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Running Check...' : 'Run Check Now'}
        </button>
      </div>

      {/* Alert Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Quality Alerts</h2>

        {alerts
          .filter(alert => alert.count > 0)
          .sort((a, b) => {
            // Sort by severity first (high > medium > low)
            const severityOrder = { high: 0, medium: 1, low: 2 };
            if (severityOrder[a.severity] !== severityOrder[b.severity]) {
              return severityOrder[a.severity] - severityOrder[b.severity];
            }
            // Then by count (descending)
            return b.count - a.count;
          })
          .map((alert) => (
            <div
              key={alert.ruleId}
              className={`border rounded-lg p-6 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{alert.name}</h3>
                      <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">
                        {alert.count} {alert.count === 1 ? 'issue' : 'issues'}
                      </span>
                      <span className="px-2 py-1 bg-white rounded text-xs font-medium uppercase">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm opacity-90 mb-4">{alert.description}</p>
                    <button
                      onClick={() =>
                        router.push(`/admin/data-integrity/${alert.ruleId}`)
                      }
                      className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium text-sm"
                    >
                      {alert.hasFix ? 'View & Fix' : 'View Details'} →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* No Issues */}
        {alerts.filter(a => a.count > 0).length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-2">
              No Issues Found
            </h3>
            <p className="text-green-700">
              Your data is in excellent condition. All validation checks passed!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
