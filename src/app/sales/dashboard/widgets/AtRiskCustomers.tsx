'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, AlertTriangle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AtRiskCustomer {
  id: string;
  name: string;
  riskStatus: 'at_risk_cadence' | 'at_risk_revenue' | 'dormant';
  lastOrderDate: string | null;
  daysOverdue: number;
  averageOrderIntervalDays: number | null;
  revenueImpact: number;
}

interface AtRiskCustomersProps {
  onRemove?: () => void;
}

export function AtRiskCustomers({ onRemove }: AtRiskCustomersProps) {
  const [customers, setCustomers] = useState<AtRiskCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await fetch('/api/dashboard/widgets/at-risk-customers');
        if (response.ok) {
          const data = await response.json();
          setCustomers(data.customers || []);
        }
      } catch (error) {
        console.error('Failed to load at-risk customers:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadCustomers();
  }, []);

  const getRiskBadge = (status: string) => {
    switch (status) {
      case 'at_risk_cadence':
        return { label: 'Cadence Risk', color: 'bg-yellow-100 text-yellow-700' };
      case 'at_risk_revenue':
        return { label: 'Revenue Risk', color: 'bg-orange-100 text-orange-700' };
      case 'dormant':
        return { label: 'Dormant', color: 'bg-red-100 text-red-700' };
      default:
        return { label: 'At Risk', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <CardTitle>At-Risk Customers</CardTitle>
        </div>
        {onRemove && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading customers...</div>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-2" />
            <div className="text-sm font-medium">All customers are healthy!</div>
            <div className="text-xs text-muted-foreground">No at-risk customers at this time</div>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => {
              const riskBadge = getRiskBadge(customer.riskStatus);

              return (
                <div
                  key={customer.id}
                  className="p-3 border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{customer.name}</h4>
                    </div>
                    <span className={cn('px-2 py-1 rounded text-xs font-medium whitespace-nowrap', riskBadge.color)}>
                      {riskBadge.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Days overdue:</span>
                      <span className="font-medium text-foreground">{customer.daysOverdue}</span>
                    </div>

                    {customer.lastOrderDate && (
                      <div className="flex items-center justify-between">
                        <span>Last order:</span>
                        <span className="font-medium text-foreground">
                          {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {customer.averageOrderIntervalDays && (
                      <div className="flex items-center justify-between">
                        <span>Avg. interval:</span>
                        <span className="font-medium text-foreground">
                          {customer.averageOrderIntervalDays} days
                        </span>
                      </div>
                    )}

                    {customer.revenueImpact > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-red-600" />
                          Revenue impact:
                        </span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(customer.revenueImpact)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
