'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { History, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { metricsApi, MetricsApiError } from '@/lib/api/metrics';
import { MetricDefinition, MetricDefinitionWithHistory } from '@/types/metrics';

interface MetricHistoryProps {
  metricCode: string;
  currentMetric: MetricDefinition;
}

export function MetricHistory({ metricCode, currentMetric }: MetricHistoryProps) {
  const [data, setData] = useState<MetricDefinitionWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await metricsApi.get(metricCode, true) as MetricDefinitionWithHistory;
      setData(response);
    } catch (err) {
      const errorMessage = err instanceof MetricsApiError
        ? err.message
        : 'Failed to load version history';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [metricCode]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading version history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold">Error Loading History</p>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={loadHistory} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const allVersions = [data, ...(data.history || [])].sort((a, b) => b.version - a.version);

  const toggleVersion = (version: number) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <History className="h-6 w-6" />
          <div>
            <CardTitle>Version History: {currentMetric.name}</CardTitle>
            <CardDescription>
              Code: <span className="font-mono">{metricCode}</span> •
              {allVersions.length} version{allVersions.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allVersions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No version history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allVersions.map((version) => {
              const isExpanded = expandedVersion === version.version;
              const isCurrent = version.version === data.currentVersion;
              const isDeprecated = !!version.deprecatedAt;

              return (
                <div
                  key={version.id}
                  className={`border rounded-lg overflow-hidden ${
                    isCurrent ? 'border-primary' : 'border-border'
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleVersion(version.version)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={isCurrent ? 'default' : 'outline'}>
                          v{version.version}
                        </Badge>
                        <div>
                          <p className="font-medium">{version.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Effective: {format(new Date(version.effectiveAt), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <Badge variant="default">Current</Badge>
                        )}
                        {isDeprecated && (
                          <Badge variant="destructive">
                            Deprecated {format(new Date(version.deprecatedAt), 'PP')}
                          </Badge>
                        )}
                        <span className="text-muted-foreground">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">{version.description}</p>
                      </div>

                      {version.formula && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Formula</h4>
                          <div className="bg-background rounded border p-3">
                            <code className="text-sm">
                              {version.formula.field} {version.formula.operator}{' '}
                              {JSON.stringify(version.formula.value)}
                            </code>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Created:</span>{' '}
                          {format(new Date(version.createdAt), 'PPP p')}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Version:</span> {version.version}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
