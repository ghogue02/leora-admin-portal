'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Filter,
  CreditCard,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Trash2,
  Eye,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Scan {
  id: string;
  type: 'business-card' | 'liquor-license';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  confidence?: number;
  extractedData?: any;
  imageUrl?: string;
  createdBy: string;
}

interface ScanStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  avgConfidence: number;
  avgProcessingTime: number;
}

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    fetchScans();
    fetchStats();
  }, [typeFilter, statusFilter, dateFilter]);

  const fetchScans = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFilter !== 'all') params.set('date', dateFilter);

      const response = await fetch(`/api/scanning?${params}`);
      const data = await response.json();
      setScans(data.scans);
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/scanning/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleRetry = async (scanId: string) => {
    try {
      await fetch(`/api/scanning/${scanId}/retry`, { method: 'POST' });
      fetchScans();
    } catch (error) {
      console.error('Failed to retry scan:', error);
    }
  };

  const handleDelete = async (scanId: string) => {
    if (!confirm('Are you sure you want to delete this scan?')) return;

    try {
      await fetch(`/api/scanning/${scanId}`, { method: 'DELETE' });
      fetchScans();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete scan:', error);
    }
  };

  const filteredScans = scans.filter(scan => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      scan.id.toLowerCase().includes(query) ||
      scan.createdBy.toLowerCase().includes(query) ||
      (scan.extractedData?.name?.value || '').toLowerCase().includes(query) ||
      (scan.extractedData?.company?.value || '').toLowerCase().includes(query) ||
      (scan.extractedData?.businessName?.value || '').toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'business-card' ? (
      <Badge variant="outline" className="gap-1">
        <CreditCard className="h-3 w-3" />
        Business Card
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1">
        <FileText className="h-3 w-3" />
        License
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Scan History</h1>
        <p className="text-muted-foreground">
          View and manage all scanned documents
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.completed} of {stats.total} scans
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avgProcessingTime.toFixed(1)}s
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="business-card">Business Card</SelectItem>
                <SelectItem value="liquor-license">License</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scans</CardTitle>
          <CardDescription>
            {filteredScans.length} scan{filteredScans.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Extracted Info</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredScans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No scans found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell>{getTypeBadge(scan.type)}</TableCell>
                      <TableCell>{getStatusBadge(scan.status)}</TableCell>
                      <TableCell>
                        {scan.extractedData && (
                          <div className="text-sm">
                            {scan.type === 'business-card' ? (
                              <>
                                <p className="font-medium">{scan.extractedData.name?.value || '-'}</p>
                                <p className="text-muted-foreground">{scan.extractedData.company?.value || '-'}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium">{scan.extractedData.businessName?.value || '-'}</p>
                                <p className="text-muted-foreground">{scan.extractedData.licenseNumber?.value || '-'}</p>
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {scan.confidence && (
                          <Badge
                            variant="outline"
                            className={cn(
                              scan.confidence >= 0.9 && "border-green-500 text-green-600",
                              scan.confidence >= 0.7 && scan.confidence < 0.9 && "border-yellow-500 text-yellow-600",
                              scan.confidence < 0.7 && "border-red-500 text-red-600"
                            )}
                          >
                            {(scan.confidence * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{scan.createdBy}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {scan.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRetry(scan.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(scan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
