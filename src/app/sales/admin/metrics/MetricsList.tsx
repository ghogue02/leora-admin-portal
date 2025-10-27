'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Search, AlertCircle, History, Edit, Archive } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { metricsApi, MetricsApiError } from '@/lib/api/metrics';
import { MetricDefinition } from '@/types/metrics';

interface MetricsListProps {
  onEdit: (metric: MetricDefinition) => void;
  onViewHistory: (metric: MetricDefinition) => void;
  refreshTrigger?: number;
}

export function MetricsList({ onEdit, onViewHistory, refreshTrigger = 0 }: MetricsListProps) {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [includeDeprecated, setIncludeDeprecated] = useState(false);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await metricsApi.list({
        search: search || undefined,
        page,
        limit: 20,
        includeDeprecated,
      });

      setMetrics(response.definitions);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      const errorMessage = err instanceof MetricsApiError
        ? err.message
        : 'Failed to load metrics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [search, page, includeDeprecated, refreshTrigger]);

  const handleDeprecate = async (metric: MetricDefinition) => {
    if (!confirm(`Are you sure you want to deprecate "${metric.name}"? This action will mark it as deprecated but preserve the definition.`)) {
      return;
    }

    try {
      await metricsApi.deprecate(metric.code);
      toast.success(`Metric "${metric.name}" has been deprecated`);
      loadMetrics();
    } catch (err) {
      const errorMessage = err instanceof MetricsApiError
        ? err.message
        : 'Failed to deprecate metric';
      toast.error(errorMessage);
    }
  };

  if (loading && metrics.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && metrics.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-semibold">Error Loading Metrics</p>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={loadMetrics} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Metric Definitions</CardTitle>
            <CardDescription>Manage all customer metric definitions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search metrics..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
            <Button
              variant={includeDeprecated ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setIncludeDeprecated(!includeDeprecated);
                setPage(1);
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              {includeDeprecated ? 'Hide' : 'Show'} Deprecated
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {metrics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {search ? 'No metrics found matching your search' : 'No metrics defined yet'}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell className="font-mono text-sm">{metric.code}</TableCell>
                    <TableCell className="font-medium">{metric.name}</TableCell>
                    <TableCell className="max-w-md truncate" title={metric.description}>
                      {metric.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">v{metric.version}</Badge>
                    </TableCell>
                    <TableCell>
                      {metric.deprecatedAt ? (
                        <Badge variant="destructive">Deprecated</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(metric.effectiveAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(metric)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onViewHistory(metric)}>
                            <History className="h-4 w-4 mr-2" />
                            View History
                          </DropdownMenuItem>
                          {!metric.deprecatedAt && (
                            <DropdownMenuItem
                              onClick={() => handleDeprecate(metric)}
                              className="text-destructive"
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Deprecate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
