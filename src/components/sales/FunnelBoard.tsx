'use client';

import { useState, useEffect } from 'react';
import { Lead, FunnelStage } from '@/lib/models/Lead';
import LeadCard from './LeadCard';

interface FunnelBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStageChange: (leadId: string, newStage: FunnelStage) => Promise<void>;
}

const FUNNEL_STAGES = [
  { key: FunnelStage.LEAD, label: 'Lead', color: 'bg-gray-100' },
  { key: FunnelStage.QUALIFIED, label: 'Qualified', color: 'bg-blue-100' },
  { key: FunnelStage.PROPOSAL, label: 'Proposal', color: 'bg-purple-100' },
  { key: FunnelStage.NEGOTIATION, label: 'Negotiation', color: 'bg-yellow-100' },
  { key: FunnelStage.CLOSED_WON, label: 'Closed Won', color: 'bg-green-100' },
  { key: FunnelStage.CLOSED_LOST, label: 'Closed Lost', color: 'bg-red-100' },
];

export default function FunnelBoard({ leads, onLeadClick, onStageChange }: FunnelBoardProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<FunnelStage | null>(null);

  const groupedLeads = FUNNEL_STAGES.reduce((acc, stage) => {
    acc[stage.key] = leads.filter(lead => lead.currentStage === stage.key);
    return acc;
  }, {} as Record<FunnelStage, Lead[]>);

  const handleDragStart = (lead: Lead) => (e: React.DragEvent) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const handleDragOver = (stage: FunnelStage) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (stage: FunnelStage) => async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStage(null);

    if (draggedLead && draggedLead.currentStage !== stage) {
      await onStageChange(draggedLead.id, stage);
    }

    setDraggedLead(null);
  };

  const calculateStageValue = (stageLeads: Lead[]) => {
    return stageLeads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {FUNNEL_STAGES.map(stage => {
        const stageLeads = groupedLeads[stage.key];
        const stageValue = calculateStageValue(stageLeads);
        const isDragOver = dragOverStage === stage.key;

        return (
          <div
            key={stage.key}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver(stage.key)}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(stage.key)}
          >
            <div className={`${stage.color} rounded-lg p-4 mb-4`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                <span className="bg-white px-2 py-1 rounded text-sm font-medium">
                  {stageLeads.length}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                Total: ${stageValue.toLocaleString()}
              </div>
            </div>

            <div
              className={`min-h-[500px] rounded-lg border-2 ${
                isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
              } p-3 space-y-3 transition-colors`}
            >
              {stageLeads.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No leads in this stage
                </div>
              ) : (
                stageLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onLeadClick(lead)}
                    draggable
                    onDragStart={handleDragStart(lead)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
