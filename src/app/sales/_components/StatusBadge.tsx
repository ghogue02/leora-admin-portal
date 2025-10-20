import { CustomerRiskStatus } from '@prisma/client';

type StatusBadgeProps = {
  status: CustomerRiskStatus | string;
  size?: 'sm' | 'md';
};

const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
  HEALTHY: {
    color: 'bg-green-100 text-green-800 border-green-200',
    label: 'Healthy',
    icon: '✓',
  },
  AT_RISK_CADENCE: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'At Risk - Cadence',
    icon: '⚠️',
  },
  AT_RISK_REVENUE: {
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'At Risk - Revenue',
    icon: '📉',
  },
  DORMANT: {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'Dormant',
    icon: '💤',
  },
  CLOSED: {
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    label: 'Closed',
    icon: '🔒',
  },
  // Order statuses
  DRAFT: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: 'Draft',
    icon: '📝',
  },
  SUBMITTED: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Submitted',
    icon: '📤',
  },
  FULFILLED: {
    color: 'bg-green-100 text-green-800 border-green-200',
    label: 'Fulfilled',
    icon: '✅',
  },
  CANCELLED: {
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'Cancelled',
    icon: '❌',
  },
  PARTIALLY_FULFILLED: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    label: 'Partially Fulfilled',
    icon: '⏳',
  },
  // Invoice statuses
  SENT: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Sent',
    icon: '📧',
  },
  PAID: {
    color: 'bg-green-100 text-green-800 border-green-200',
    label: 'Paid',
    icon: '💰',
  },
  OVERDUE: {
    color: 'bg-red-100 text-red-800 border-red-200',
    label: 'Overdue',
    icon: '⏰',
  },
  VOID: {
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    label: 'Void',
    icon: '🚫',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: status,
    icon: '',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
    >
      {config.icon && <span className="text-xs">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}

// Risk-specific badge with detailed tooltip
export function RiskBadge({ status }: { status: CustomerRiskStatus }) {
  return <StatusBadge status={status} />;
}

// Order status badge
export function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} size="sm" />;
}

// Invoice status badge
export function InvoiceStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} size="sm" />;
}
