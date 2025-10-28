/**
 * Customer Insights Component
 *
 * Displays AI-powered predictive analytics and insights for a customer
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Package,
  Lightbulb,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface CustomerInsights {
  customerId: string;
  lifetimeValue: number;
  averageOrderValue: number;
  orderFrequency: number;
  churnRisk: 'low' | 'medium' | 'high';
  growthTrend: 'growing' | 'stable' | 'declining';
  recommendations: string[];
}

interface OrderPrediction {
  customerId: string;
  nextExpectedOrderDate: Date | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceScore: number;
  predictionMethod: string;
  factors: {
    historicalPattern: string;
    seasonalityFactor: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
    recentActivityWeight: number;
  };
}

interface CustomerInsightsProps {
  customerId: string;
  className?: string;
}

export function CustomerInsights({ customerId, className }: CustomerInsightsProps) {
  const [insights, setInsights] = useState<CustomerInsights | null>(null);
  const [prediction, setPrediction] = useState<OrderPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);

        const [insightsRes, predictionRes] = await Promise.all([
          fetch(`/api/ai/insights/customer?customerId=${customerId}`),
          fetch(`/api/ai/predictions/next-order?customerId=${customerId}`),
        ]);

        if (!insightsRes.ok || !predictionRes.ok) {
          throw new Error('Failed to fetch insights');
        }

        const [insightsData, predictionData] = await Promise.all([
          insightsRes.json(),
          predictionRes.json(),
        ]);

        setInsights(insightsData);
        setPrediction(predictionData);
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError('Failed to load customer insights');
      } finally {
        setLoading(false);
      }
    }

    if (customerId) {
      fetchInsights();
    }
  }, [customerId]);

  const getChurnRiskBadge = (risk: string) => {
    const styles = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-red-100 text-red-800 border-red-300',
    };

    const icons = {
      low: null,
      medium: <AlertTriangle className="w-3 h-3" />,
      high: <AlertTriangle className="w-3 h-3" />,
    };

    return (
      <Badge variant="outline" className={`${styles[risk as keyof typeof styles]} flex items-center gap-1`}>
        {icons[risk as keyof typeof icons]}
        {risk.charAt(0).toUpperCase() + risk.slice(1)} Churn Risk
      </Badge>
    );
  };

  const getGrowthTrendIcon = (trend: string) => {
    const icons = {
      growing: <TrendingUp className="w-4 h-4 text-green-500" />,
      stable: <Package className="w-4 h-4 text-blue-500" />,
      declining: <TrendingDown className="w-4 h-4 text-red-500" />,
    };

    return icons[trend as keyof typeof icons];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Insights & Predictions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !insights || !prediction) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Insights & Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error || 'Failed to load insights'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          AI Insights & Predictions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Next Order Prediction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Next Expected Order
            </h4>
            <Badge
              variant="outline"
              className={
                prediction.confidenceLevel === 'high'
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : prediction.confidenceLevel === 'medium'
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              }
            >
              {prediction.confidenceScore}% Confidence
            </Badge>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-lg font-semibold text-blue-900">
              {formatDate(prediction.nextExpectedOrderDate)}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {prediction.factors.historicalPattern}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
              <span className="capitalize">Trend: {prediction.factors.trendDirection}</span>
              {prediction.factors.seasonalityFactor > 0.3 && <span>Seasonal Pattern Detected</span>}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Lifetime Value
            </p>
            <p className="text-lg font-semibold">{formatCurrency(insights.lifetimeValue)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Avg Order Value
            </p>
            <p className="text-lg font-semibold">{formatCurrency(insights.averageOrderValue)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3" />
              Order Frequency
            </p>
            <p className="text-lg font-semibold">{formatNumber(insights.orderFrequency)}/month</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getGrowthTrendIcon(insights.growthTrend)}
              Growth Trend
            </p>
            <p className="text-lg font-semibold capitalize">{insights.growthTrend}</p>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Risk Assessment</h4>
          <div className="flex items-center gap-2">
            {getChurnRiskBadge(insights.churnRisk)}
          </div>
        </div>

        {/* AI Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              AI Recommendations
            </h4>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="text-sm flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded"
                >
                  <span className="text-yellow-600 mt-0.5">•</span>
                  <span className="text-yellow-900">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
