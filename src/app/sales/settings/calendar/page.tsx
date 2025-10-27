'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Calendar } from 'lucide-react';

interface SyncStatus {
  id: string;
  provider: 'google' | 'outlook';
  isActive: boolean;
  lastSync?: string;
  lastError?: string;
  consecutiveFailures: number;
  metrics: {
    lastSuccessfulSync?: string;
    consecutiveFailures: number;
    eventsSynced: number;
    syncDuration: number;
    lastError?: string;
  };
  tokenExpiry?: string;
  tokenAge?: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  syncs: SyncStatus[];
  summary: {
    totalSyncs: number;
    activeSyncs: number;
    syncsWithErrors: number;
    connectedProviders: number;
  };
}

export default function CalendarSettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resyncingProvider, setResyncingProvider] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calendar/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar health:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResync = async (provider: 'google' | 'outlook') => {
    try {
      setResyncingProvider(provider);
      const response = await fetch('/api/calendar/health/resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (response.ok) {
        // Refresh health status
        await fetchHealth();
      }
    } catch (error) {
      console.error(`Failed to resync ${provider}:`, error);
    } finally {
      setResyncingProvider(null);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (sync: SyncStatus) => {
    if (!sync.isActive) {
      return <Badge variant="destructive">Disabled</Badge>;
    }
    if (sync.consecutiveFailures > 0) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (sync.lastSync) {
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getStatusIcon = (sync: SyncStatus) => {
    if (!sync.isActive || sync.consecutiveFailures >= 5) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (sync.consecutiveFailures > 0) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Calendar Settings</h1>
          <p className="text-muted-foreground">Manage your calendar integrations and sync status</p>
        </div>
        <Button onClick={fetchHealth} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {health && (
        <>
          {/* Overall Health Status */}
          <Alert variant={health.status === 'healthy' ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex justify-between items-center">
                <span>
                  Overall Status: <strong className="capitalize">{health.status}</strong>
                </span>
                <span className="text-sm">
                  {health.summary.activeSyncs} / {health.summary.totalSyncs} active syncs
                </span>
              </div>
            </AlertDescription>
          </Alert>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Syncs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health.summary.totalSyncs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Syncs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {health.summary.activeSyncs}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">With Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {health.summary.syncsWithErrors}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Connected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health.summary.connectedProviders}</div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Calendar Syncs */}
          <div className="space-y-4">
            {health.syncs.map((sync) => (
              <Card key={sync.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(sync)}
                      <div>
                        <CardTitle className="capitalize">{sync.provider} Calendar</CardTitle>
                        <CardDescription>
                          Last synced: {formatTimeAgo(sync.metrics.lastSuccessfulSync)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(sync)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResync(sync.provider)}
                        disabled={resyncingProvider === sync.provider}
                      >
                        {resyncingProvider === sync.provider ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <Calendar className="h-4 w-4 mr-2" />
                            Resync
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Error Message */}
                  {sync.lastError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{sync.lastError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Events Synced</div>
                      <div className="text-lg font-semibold">{sync.metrics.eventsSynced}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Sync Duration</div>
                      <div className="text-lg font-semibold">
                        {formatDuration(sync.metrics.syncDuration)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Consecutive Failures</div>
                      <div
                        className={`text-lg font-semibold ${
                          sync.consecutiveFailures > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {sync.consecutiveFailures}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Token Expires</div>
                      <div className="text-lg font-semibold">
                        {sync.tokenExpiry ? formatTimeAgo(sync.tokenExpiry) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Token Age Warning */}
                  {sync.tokenAge && sync.tokenAge > 90 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This token is {sync.tokenAge} days old. Consider reconnecting your calendar
                        for improved reliability.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No Calendars Connected */}
          {health.syncs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Calendars Connected</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your Google or Outlook calendar to start syncing events
                </p>
                <Button>Connect Calendar</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
