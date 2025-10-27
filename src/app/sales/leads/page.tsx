'use client';

import { useState, useEffect } from 'react';
import { Lead, LeadSource, InterestLevel, FunnelStage } from '@/lib/models/Lead';
import LeadForm from '@/components/sales/LeadForm';
import LeadCard from '@/components/sales/LeadCard';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    stage: '',
    leadSource: '',
    interestLevel: '',
    assignedRepId: '',
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, filters]);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/sales/leads');
      if (!response.ok) throw new Error('Failed to fetch leads');
      const data = await response.json();
      setLeads(data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = [...leads];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        lead =>
          lead.companyName.toLowerCase().includes(search) ||
          lead.contactName.toLowerCase().includes(search) ||
          lead.email.toLowerCase().includes(search)
      );
    }

    if (filters.stage) {
      filtered = filtered.filter(lead => lead.currentStage === filters.stage);
    }

    if (filters.leadSource) {
      filtered = filtered.filter(lead => lead.leadSource === filters.leadSource);
    }

    if (filters.interestLevel) {
      filtered = filtered.filter(lead => lead.interestLevel === filters.interestLevel);
    }

    if (filters.assignedRepId) {
      filtered = filtered.filter(lead => lead.assignedRepId === filters.assignedRepId);
    }

    setFilteredLeads(filtered);
  };

  const handleCreateLead = async (data: any) => {
    const response = await fetch('/api/sales/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to create lead');

    await fetchLeads();
    setShowForm(false);
  };

  const handleUpdateLead = async (data: any) => {
    if (!selectedLead) return;

    const response = await fetch(`/api/sales/leads/${selectedLead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to update lead');

    await fetchLeads();
    setShowForm(false);
    setSelectedLead(null);
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    const response = await fetch(`/api/sales/leads/${leadId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete lead');
    await fetchLeads();
    setSelectedLead(null);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setShowForm(true);
  };

  const handleConvertToCustomer = async (leadId: string) => {
    const customerId = prompt('Enter customer ID to convert to:');
    if (!customerId) return;

    const response = await fetch(`/api/sales/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ convertedToCustomerId: customerId }),
    });

    if (!response.ok) throw new Error('Failed to convert lead');
    await fetchLeads();
    setSelectedLead(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600 mt-2">Manage your sales leads and track progress</p>
        </div>
        <button
          onClick={() => {
            setSelectedLead(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Add New Lead
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search leads..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <select
            value={filters.stage}
            onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Stages</option>
            {Object.values(FunnelStage).map(stage => (
              <option key={stage} value={stage}>
                {stage.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={filters.leadSource}
            onChange={(e) => setFilters({ ...filters, leadSource: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Sources</option>
            {Object.values(LeadSource).map(source => (
              <option key={source} value={source}>
                {source.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={filters.interestLevel}
            onChange={(e) => setFilters({ ...filters, interestLevel: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Interest Levels</option>
            {Object.values(InterestLevel).map(level => (
              <option key={level} value={level}>
                {level.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            onClick={() => setFilters({ search: '', stage: '', leadSource: '', interestLevel: '', assignedRepId: '' })}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Lead Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedLead ? 'Edit Lead' : 'Create New Lead'}
            </h2>
            <LeadForm
              initialData={selectedLead}
              onSubmit={selectedLead ? handleUpdateLead : handleCreateLead}
              onCancel={() => {
                setShowForm(false);
                setSelectedLead(null);
              }}
              products={['Product A', 'Product B', 'Product C', 'Service X', 'Service Y']}
            />
            {selectedLead && (
              <div className="mt-6 pt-6 border-t border-gray-200 flex gap-4">
                <button
                  onClick={() => handleConvertToCustomer(selectedLead.id)}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Convert to Customer
                </button>
                <button
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Lead
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leads List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No leads found</p>
            <p className="text-gray-400 mt-2">
              {filters.search || filters.stage || filters.leadSource || filters.interestLevel
                ? 'Try adjusting your filters'
                : 'Create your first lead to get started'}
            </p>
          </div>
        ) : (
          filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => handleLeadClick(lead)}
            />
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Leads</div>
          <div className="text-3xl font-bold text-gray-900">{filteredLeads.length}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Hot Leads</div>
          <div className="text-3xl font-bold text-red-600">
            {filteredLeads.filter(l => l.interestLevel === InterestLevel.HOT).length}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Warm Leads</div>
          <div className="text-3xl font-bold text-yellow-600">
            {filteredLeads.filter(l => l.interestLevel === InterestLevel.WARM).length}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Value</div>
          <div className="text-3xl font-bold text-green-600">
            ${filteredLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
