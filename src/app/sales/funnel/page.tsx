'use client';

import { useState, useEffect } from 'react';
import { Lead, FunnelStage, PipelineMetrics } from '@/lib/models/Lead';
import FunnelBoard from '@/components/sales/FunnelBoard';
import PipelineMetrics from '@/components/sales/PipelineMetrics';

export default function FunnelPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);
  const [filters, setFilters] = useState({
    assignedRepId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchLeads(), fetchMetrics()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    const params = new URLSearchParams();
    if (filters.assignedRepId) params.append('assignedRepId', filters.assignedRepId);

    const response = await fetch(`/api/sales/leads?${params}`);
    if (!response.ok) throw new Error('Failed to fetch leads');
    const data = await response.json();
    setLeads(data);
  };

  const fetchMetrics = async () => {
    const params = new URLSearchParams();
    if (filters.assignedRepId) params.append('assignedRepId', filters.assignedRepId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(`/api/sales/funnel/metrics?${params}`);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    const data = await response.json();
    setMetrics(data);
  };

  const handleStageChange = async (leadId: string, newStage: FunnelStage) => {
    try {
      let notes = '';
      let winLossReason = '';

      if (newStage === FunnelStage.CLOSED_WON || newStage === FunnelStage.CLOSED_LOST) {
        winLossReason = prompt('Please provide a reason for closing:') || '';
      }

      const response = await fetch(`/api/sales/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage, notes, winLossReason }),
      });

      if (!response.ok) throw new Error('Failed to update stage');

      await fetchData();
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Failed to update lead stage');
    }
  };

  const handleLeadClick = async (lead: Lead) => {
    setSelectedLead(lead);
    // Fetch lead history
    try {
      const response = await fetch(`/api/sales/leads/${lead.id}/history`);
      if (response.ok) {
        const history = await response.json();
        console.log('Lead history:', history);
      }
    } catch (error) {
      console.error('Error fetching lead history:', error);
    }
  };

  const exportPipeline = () => {
    const csvData = leads.map(lead => ({
      Company: lead.companyName,
      Contact: lead.contactName,
      Email: lead.email,
      Stage: lead.currentStage,
      Value: lead.estimatedValue || 0,
      Source: lead.leadSource,
      Interest: lead.interestLevel,
      Created: new Date(lead.createdAt).toLocaleDateString(),
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Funnel</h1>
          <p className="text-gray-600 mt-2">Visualize and manage your sales pipeline</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </button>
          <button
            onClick={exportPipeline}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Export Pipeline
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Rep
            </label>
            <select
              value={filters.assignedRepId}
              onChange={(e) => setFilters({ ...filters, assignedRepId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Reps</option>
              {/* Add sales reps dynamically */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ assignedRepId: '', startDate: '', endDate: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {showMetrics && metrics && (
        <div className="mb-6">
          <PipelineMetrics metrics={metrics} />
        </div>
      )}

      {/* Funnel Board */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <FunnelBoard
          leads={leads}
          onLeadClick={handleLeadClick}
          onStageChange={handleStageChange}
        />
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedLead.companyName}</h2>
                <p className="text-gray-600 mt-1">{selectedLead.contactName}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{selectedLead.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{selectedLead.phone || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Current Stage</label>
                <p className="text-gray-900 capitalize">{selectedLead.currentStage.replace('_', ' ')}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Estimated Value</label>
                <p className="text-gray-900">${selectedLead.estimatedValue?.toLocaleString() || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Lead Source</label>
                <p className="text-gray-900 capitalize">{selectedLead.leadSource.replace('_', ' ')}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Interest Level</label>
                <p className="text-gray-900 capitalize">{selectedLead.interestLevel}</p>
              </div>

              {selectedLead.productsInterested && selectedLead.productsInterested.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Products Interested</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedLead.productsInterested.map(product => (
                      <span key={product} className="px-3 py-1 bg-blue-100 text-blue-700 rounded">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLead.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="text-gray-900">{new Date(selectedLead.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedLead(null)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
