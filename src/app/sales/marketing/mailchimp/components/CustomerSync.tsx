'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  TrendingUp,
  Info
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MailchimpList {
  id: string;
  name: string;
  memberCount: number;
  lastSync: Date;
  isDefault: boolean;
}

interface SyncHistory {
  id: string;
  timestamp: Date;
  status: 'success' | 'partial' | 'failed';
  customersProcessed: number;
  customersAdded: number;
  customersUpdated: number;
  errors: number;
  duration: number;
}

interface CustomerSyncProps {
  lists: MailchimpList[];
  onSyncComplete: () => void;
}

export function CustomerSync({ lists, onSyncComplete }: CustomerSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      status: 'success',
      customersProcessed: 1234,
      customersAdded: 45,
      customersUpdated: 189,
      errors: 0,
      duration: 12500,
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 86400000),
      status: 'success',
      customersProcessed: 1220,
      customersAdded: 12,
      customersUpdated: 67,
      errors: 0,
      duration: 11200,
    },
  ]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);

    try {
      const response = await fetch('/api/mailchimp/sync', {
        method: 'POST',
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 500);

      if (response.ok) {
        const result = await response.json();

        clearInterval(progressInterval);
        setSyncProgress(100);

        // Add to history
        const newHistoryEntry: SyncHistory = {
          id: Date.now().toString(),
          timestamp: new Date(),
          status: result.errors > 0 ? 'partial' : 'success',
          customersProcessed: result.processed || 0,
          customersAdded: result.added || 0,
          customersUpdated: result.updated || 0,
          errors: result.errors || 0,
          duration: result.duration || 0,
        };

        setSyncHistory((prev) => [newHistoryEntry, ...prev]);

        setTimeout(() => {
          onSyncComplete();
        }, 1000);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
      }, 1500);
    }
  };

  const getStatusIcon = (status: SyncHistory['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: SyncHistory['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'partial':
        return <Badge variant="default" className="bg-yellow-500">Partial</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Synchronization</CardTitle>
              <CardDescription>
                Sync your customer data with Mailchimp audience lists
              </CardDescription>
            </div>
            <Button onClick={handleManualSync} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Syncing customers...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} />
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Automatic sync runs daily at 2:00 AM. You can also trigger a manual sync anytime.
            </AlertDescription>
          </Alert>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Synced</span>
              </div>
              <p className="text-2xl font-bold">
                {lists.reduce((sum, list) => sum + list.memberCount, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">customers</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Sync</span>
              </div>
              <p className="text-2xl font-bold">
                {syncHistory[0] ? new Date(syncHistory[0].timestamp).toLocaleTimeString() : 'Never'}
              </p>
              <p className="text-xs text-muted-foreground">
                {syncHistory[0] ? new Date(syncHistory[0].timestamp).toLocaleDateString() : ''}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Success Rate</span>
              </div>
              <p className="text-2xl font-bold">
                {syncHistory.length > 0
                  ? ((syncHistory.filter(h => h.status === 'success').length / syncHistory.length) * 100).toFixed(0)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">last 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>Recent synchronization activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Processed</TableHead>
                <TableHead className="text-right">Added</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="text-right">Errors</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncHistory.map((sync) => (
                <TableRow key={sync.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(sync.status)}
                      {getStatusBadge(sync.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {new Date(sync.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sync.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{sync.customersProcessed}</TableCell>
                  <TableCell className="text-right text-green-600">{sync.customersAdded}</TableCell>
                  <TableCell className="text-right text-blue-600">{sync.customersUpdated}</TableCell>
                  <TableCell className="text-right">
                    {sync.errors > 0 ? (
                      <span className="text-red-600">{sync.errors}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDuration(sync.duration)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
