'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveChartContainer } from '@/components/ui/responsive-chart-container';
import {
  Mail,
  TrendingUp,
  Users,
  Activity,
  Settings,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface IntegrationStatus {
  mailchimp: {
    connected: boolean;
    apiKey?: string;
    listCount: number;
    lastSync?: Date;
    health: 'healthy' | 'warning' | 'error';
  };
}

interface CampaignMetrics {
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  conversions: number;
}

const mockGrowthData = [
  { month: 'Jan', subscribers: 450, campaigns: 3 },
  { month: 'Feb', subscribers: 520, campaigns: 4 },
  { month: 'Mar', subscribers: 610, campaigns: 5 },
  { month: 'Apr', subscribers: 720, campaigns: 4 },
  { month: 'May', subscribers: 850, campaigns: 6 },
  { month: 'Jun', subscribers: 980, campaigns: 5 },
];

const mockPerformanceData = [
  { campaign: 'Spring Sale', opens: 42, clicks: 18, conversions: 8 },
  { campaign: 'New Products', opens: 38, clicks: 15, conversions: 6 },
  { campaign: 'Newsletter', opens: 35, clicks: 12, conversions: 4 },
  { campaign: 'Summer Promo', opens: 45, clicks: 22, conversions: 10 },
];

export default function MarketingAdminPage() {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    mailchimp: {
      connected: false,
      listCount: 0,
      health: 'healthy',
    },
  });
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    totalSent: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    conversions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load integration status
      const statusRes = await fetch('/api/mailchimp/admin/status');
      const statusData = await statusRes.json();
      setIntegrationStatus(statusData);

      // Load metrics
      const metricsRes = await fetch('/api/mailchimp/admin/metrics');
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthBadge = (health: IntegrationStatus['mailchimp']['health']) => {
    switch (health) {
      case 'healthy':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="default" className="bg-yellow-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Administration</h1>
          <p className="text-muted-foreground">
            Manage integrations and monitor campaign performance
          </p>
        </div>
        <Button variant="outline" onClick={loadDashboardData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Integration Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <CardTitle>Mailchimp Integration</CardTitle>
              </div>
              {getHealthBadge(integrationStatus.mailchimp.health)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-medium">
                  {integrationStatus.mailchimp.connected ? 'Connected' : 'Not Connected'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lists</p>
                <p className="text-lg font-medium">{integrationStatus.mailchimp.listCount}</p>
              </div>
            </div>

            {integrationStatus.mailchimp.lastSync && (
              <div>
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="text-sm">
                  {new Date(integrationStatus.mailchimp.lastSync).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {integrationStatus.mailchimp.connected ? (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/sales/settings/integrations">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/sales/marketing/mailchimp">
                      <Activity className="h-4 w-4 mr-2" />
                      View Dashboard
                    </a>
                  </Button>
                </>
              ) : (
                <Button size="sm" asChild>
                  <a href="/sales/settings/integrations">
                    Connect Mailchimp
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>Overall metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Campaigns Sent</p>
                <p className="text-2xl font-bold">{metrics.totalSent}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                <p className="text-2xl font-bold">{(metrics.avgOpenRate * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Click Rate</p>
                <p className="text-2xl font-bold">{(metrics.avgClickRate * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversions</p>
                <p className="text-2xl font-bold">{metrics.conversions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="growth">Growth Trends</TabsTrigger>
          <TabsTrigger value="performance">Campaign Performance</TabsTrigger>
          <TabsTrigger value="schedule">Sync Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscriber Growth</CardTitle>
              <CardDescription>Monthly subscriber and campaign trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveChartContainer minHeight={320}>
                {({ height, isCompact }) => (
                  <ResponsiveContainer width="100%" height={height}>
                    <AreaChart data={mockGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      {!isCompact && <Legend />}
                      <Area
                        type="monotone"
                        dataKey="subscribers"
                        stroke="#7c3aed"
                        fill="#7c3aed"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="campaigns"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ResponsiveChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Comparison</CardTitle>
              <CardDescription>Opens, clicks, and conversions by campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveChartContainer minHeight={320}>
                {({ height, isCompact }) => (
                  <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={mockPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="campaign" />
                      <YAxis />
                      <Tooltip />
                      {!isCompact && <Legend />}
                      <Bar dataKey="opens" fill="#7c3aed" />
                      <Bar dataKey="clicks" fill="#3b82f6" />
                      <Bar dataKey="conversions" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ResponsiveChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Schedule Configuration</CardTitle>
              <CardDescription>Automatic customer synchronization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Daily Sync</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync customers every day at 2:00 AM
                  </p>
                </div>
                <Badge variant="default" className="bg-green-500">Enabled</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Real-time Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Sync new customers immediately after creation
                  </p>
                </div>
                <Badge variant="secondary">Disabled</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Segment Auto-Update</p>
                  <p className="text-sm text-muted-foreground">
                    Refresh segments when customer data changes
                  </p>
                </div>
                <Badge variant="default" className="bg-green-500">Enabled</Badge>
              </div>

              <Button asChild>
                <a href="/sales/settings/integrations">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Schedule
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
