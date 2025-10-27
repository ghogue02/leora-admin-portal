'use client';

import { Lead, InterestLevel } from '@/lib/models/Lead';
import { formatCurrency } from '@/lib/utils/format';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export default function LeadCard({ lead, onClick, draggable, onDragStart, onDragEnd }: LeadCardProps) {
  const interestLevelColors = {
    [InterestLevel.HOT]: 'bg-red-100 text-red-800 border-red-300',
    [InterestLevel.WARM]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    [InterestLevel.COLD]: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const daysInStage = Math.floor(
    (new Date().getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 p-4 ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} transition-shadow`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{lead.companyName}</h3>
          <p className="text-sm text-gray-600">{lead.contactName}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium border ${
            interestLevelColors[lead.interestLevel]
          }`}
        >
          {lead.interestLevel.toUpperCase()}
        </span>
      </div>

      {lead.estimatedValue && (
        <div className="text-lg font-bold text-gray-900 mb-2">
          {formatCurrency(lead.estimatedValue)}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {lead.productsInterested && lead.productsInterested.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lead.productsInterested.slice(0, 2).map(product => (
              <span
                key={product}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {product}
              </span>
            ))}
            {lead.productsInterested.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                +{lead.productsInterested.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{daysInStage} days in stage</span>
        <span className="capitalize">{lead.leadSource.replace('_', ' ')}</span>
      </div>

      {lead.assignedRepId && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-600">Assigned Rep ID: {lead.assignedRepId}</span>
        </div>
      )}
    </div>
  );
}
