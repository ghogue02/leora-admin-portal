'use client';

/**
 * AI Product Recommendations Component
 * Displays AI-powered product recommendations with reasoning and confidence
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, ShoppingCart, X, Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  varietal?: string;
  vintage?: number;
  price: number;
  description?: string;
  stock_quantity?: number;
}

interface Recommendation {
  productId: string;
  reason: string;
  confidence: number;
  product: Product | null;
}

interface ProductRecommendationsProps {
  customerId: string;
  occasion?: string;
  limit?: number;
  minConfidence?: number;
  onAddToOrder?: (productId: string) => void;
  showAddToOrder?: boolean;
}

export function ProductRecommendations({
  customerId,
  occasion,
  limit = 5,
  minConfidence = 0.6,
  onAddToOrder,
  showAddToOrder = true,
}: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecommendations();
  }, [customerId, occasion, limit, minConfidence]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recommendations/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          occasion,
          limit,
          minConfidence,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToOrder = async (recommendation: Recommendation) => {
    if (!recommendation.product) return;

    // Track acceptance feedback
    await trackFeedback(recommendation, 'accepted');

    // Call parent handler
    if (onAddToOrder) {
      onAddToOrder(recommendation.product.id);
    }
  };

  const handleDismiss = async (recommendation: Recommendation) => {
    // Track rejection feedback
    await trackFeedback(recommendation, 'rejected');

    // Add to dismissed list
    setDismissedIds(prev => new Set([...prev, recommendation.productId]));
  };

  const handleDefer = async (recommendation: Recommendation) => {
    // Track deferred feedback
    await trackFeedback(recommendation, 'deferred');

    // Add to dismissed list (for now)
    setDismissedIds(prev => new Set([...prev, recommendation.productId]));
  };

  const trackFeedback = async (
    recommendation: Recommendation,
    action: 'accepted' | 'rejected' | 'deferred'
  ) => {
    try {
      await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          productId: recommendation.productId,
          recommendationReason: recommendation.reason,
          confidence: recommendation.confidence,
          action,
        }),
      });
    } catch (err) {
      console.error('Error tracking feedback:', err);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const visibleRecommendations = recommendations.filter(
    rec => !dismissedIds.has(rec.productId)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Recommendations
          </CardTitle>
          <CardDescription>Loading personalized suggestions...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (visibleRecommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No recommendations available at this time. Try adjusting your preferences or check back
            later.
          </p>
          <Button variant="outline" size="sm" onClick={fetchRecommendations} className="mt-4">
            Refresh Recommendations
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Recommendations
          {occasion && (
            <Badge variant="outline" className="ml-2">
              {occasion}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Personalized product suggestions based on order history and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleRecommendations.map((recommendation, index) => {
          const product = recommendation.product;
          if (!product) return null;

          return (
            <div
              key={recommendation.productId}
              className="border rounded-lg p-4 space-y-3 hover:border-purple-300 transition-colors"
            >
              {/* Header with product name and confidence */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <h4 className="font-semibold text-sm">{product.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{product.category}</span>
                    {product.varietal && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{product.varietal}</span>
                      </>
                    )}
                    {product.vintage && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{product.vintage}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Confidence indicator */}
                <div className="flex flex-col items-end gap-1">
                  <div className={`flex items-center gap-1 ${getConfidenceColor(recommendation.confidence)}`}>
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {getConfidenceLabel(recommendation.confidence)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {Math.round(recommendation.confidence * 100)}% match
                  </span>
                </div>
              </div>

              {/* AI reasoning */}
              <div className="bg-purple-50 rounded p-3">
                <p className="text-sm text-gray-700 italic">"{recommendation.reason}"</p>
              </div>

              {/* Product details */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-green-600">
                  ${product.price.toFixed(2)}
                </span>
                {product.stock_quantity !== undefined && (
                  <span className="text-xs text-gray-500">
                    {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                {showAddToOrder && onAddToOrder && (
                  <Button
                    size="sm"
                    onClick={() => handleAddToOrder(recommendation)}
                    className="flex-1"
                    disabled={product.stock_quantity === 0}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Order
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDefer(recommendation)}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Later
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(recommendation)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Refresh button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecommendations}
            className="w-full"
          >
            Refresh Recommendations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
