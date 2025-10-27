'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  Users,
  TrendingUp,
  Calendar,
  RefreshCw,
  Plus,
  BarChart3,
  Target,
  Send
} from 'lucide-react';
import { MailchimpConnection } from './components/MailchimpConnection';
import { CustomerSync } from './components/CustomerSync';
import { SegmentBuilder } from './components/SegmentBuilder';
import { CampaignCard } from './components/CampaignCard';

interface MailchimpList {
  id: string;
  name: string;
  memberCount: number;
  lastSync: Date;
  isDefault: boolean;
}

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentDate?: Date;
  recipientCount: number;
  opens: number;
  clicks: number;
  conversions: number;
}

interface Segment {
  id: string;
  name: string;
  type: 'ACTIVE' | 'TARGET' | 'PROSPECT' | 'CUSTOM';
  customerCount: number;
  lastUpdated: Date;
}

export default function MailchimpDashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [lists, setLists] = useState<MailchimpList[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadMailchimpData();
  }, []);

  const loadMailchimpData = async () => {
    try {
      // Check connection status
      const connectionRes = await fetch('/api/mailchimp/status');
      const { connected } = await connectionRes.json();
      setIsConnected(connected);

      if (connected) {
        // Load lists
        const listsRes = await fetch('/api/mailchimp/lists');
        const listsData = await listsRes.json();
        setLists(listsData);

        // Load campaigns
        const campaignsRes = await fetch('/api/mailchimp/campaigns');
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);

        // Load segments
        const segmentsRes = await fetch('/api/mailchimp/segments');
        const segmentsData = await segmentsRes.json();
        setSegments(segmentsData);
      }
    } catch (error) {
      console.error('Failed to load Mailchimp data:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/mailchimp/sync', { method: 'POST' });
      await loadMailchimpData();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-6 w-6" />
                Connect Mailchimp
              </CardTitle>
              <CardDescription>
                Connect your Mailchimp account to sync customers and send email campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MailchimpConnection onConnect={() => setIsConnected(true)} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalSubscribers = lists.reduce((sum, list) => sum + list.memberCount, 0);
  const totalSent = campaigns.filter(c => c.status === 'sent').length;
  const avgOpenRate = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + (c.opens / c.recipientCount || 0), 0) / campaigns.length
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Marketing</h1>
          <p className="text-muted-foreground">Manage campaigns and customer segments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Customers
          </Button>
          <Button asChild>
            <a href="/sales/marketing/mailchimp/campaigns/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {lists.length} {lists.length === 1 ? 'list' : 'lists'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
            <p className="text-xs text-muted-foreground">
              {campaigns.filter(c => c.status === 'draft').length} drafts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(avgOpenRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Segments</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.length}</div>
            <p className="text-xs text-muted-foreground">Customer groups</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Connected Lists */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Lists</CardTitle>
              <CardDescription>Your Mailchimp audience lists</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lists.map(list => (
                <div key={list.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{list.name}</h3>
                      {list.isDefault && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {list.memberCount.toLocaleString()} subscribers
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Last synced: {list.lastSync.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest email campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.slice(0, 6).map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
          {campaigns.length === 0 && (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">Create your first email campaign to get started</p>
              <Button asChild>
                <a href="/sales/marketing/mailchimp/campaigns/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </a>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <SegmentBuilder segments={segments} onSegmentCreated={loadMailchimpData} />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <CustomerSync lists={lists} onSyncComplete={loadMailchimpData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
