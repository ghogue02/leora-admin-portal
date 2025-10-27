'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueData {
  period: string;
  revenue: number;
  target: number;
  growth: number;
}

interface RevenueTrendProps {
  onRemove?: () => void;
}

export function RevenueTrend({ onRemove }: RevenueTrendProps) {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    averageGrowth: 0,
    targetAchievement: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/dashboard/widgets/revenue-trend');
        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
          setSummary(result.summary || { totalRevenue: 0, averageGrowth: 0, targetAchievement: 0 });
        }
      } catch (error) {
        console.error('Failed to load revenue trend:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Revenue Trend</CardTitle>
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
            <div className="text-sm text-muted-foreground">Loading revenue data...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
                <div className="text-lg font-bold">{formatCurrency(summary.totalRevenue)}</div>
              </div>

              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">Avg. Growth</div>
                <div className={cn(
                  'text-lg font-bold flex items-center gap-1',
                  summary.averageGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {summary.averageGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatPercentage(summary.averageGrowth)}
                </div>
              </div>

              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">Target</div>
                <div className={cn(
                  'text-lg font-bold',
                  summary.targetAchievement >= 100 ? 'text-green-600' : 'text-yellow-600'
                )}>
                  {summary.targetAchievement.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Trend Chart (Simplified Bar Chart) */}
            {data.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-3">Last 8 Weeks</div>
                {data.map((item, index) => {
                  const percentage = (item.revenue / item.target) * 100;
                  const isAboveTarget = percentage >= 100;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.period}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(item.revenue)}</span>
                          <span className={cn(
                            'text-xs',
                            item.growth >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatPercentage(item.growth)}
                          </span>
                        </div>
                      </div>

                      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            isAboveTarget
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          )}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                        {percentage > 100 && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-green-700">
                            +{(percentage - 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">No revenue data available</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
