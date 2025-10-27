'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Settings,
  TrendingUp,
  ExternalLink,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  connected: boolean;
  lastSync?: Date;
  status: 'active' | 'error' | 'inactive';
  usageStats?: {
    label: string;
    value: string;
  };
}

export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Email marketing and customer segmentation',
      icon: Mail,
      connected: false,
      status: 'inactive',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync appointments and call schedules',
      icon: Calendar,
      connected: false,
      status: 'inactive',
    },
    {
      id: 'outlook-calendar',
      name: 'Outlook Calendar',
      description: 'Sync appointments and call schedules',
      icon: Calendar,
      connected: false,
      status: 'inactive',
    },
    {
      id: 'mapbox',
      name: 'Mapbox',
      description: 'Territory mapping and route optimization',
      icon: MapPin,
      connected: true,
      status: 'active',
      lastSync: new Date(),
      usageStats: {
        label: 'API Calls (month)',
        value: '12,450 / 50,000',
      },
    },
  ]);

  const [autoSync, setAutoSync] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(false);

  const loadIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status');
      const data = await response.json();
      // Update integration statuses
      setIntegrations(prev =>
        prev.map(integration => ({
          ...integration,
          ...data[integration.id],
        }))
      );
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const handleConnect = async (integrationId: string) => {
    if (integrationId === 'mailchimp') {
      window.location.href = '/sales/marketing/mailchimp';
    } else {
      // Handle other integrations
      console.log('Connect:', integrationId);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      await fetch(`/api/integrations/${integrationId}/disconnect`, {
        method: 'POST',
      });
      await loadIntegrationStatus();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleConfigure = (integrationId: string) => {
    // Navigate to configuration page
    console.log('Configure:', integrationId);
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'inactive':
        return <Badge variant="secondary">Not Connected</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect external services to enhance your workflow
        </p>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Global Integration Settings</CardTitle>
          <CardDescription>
            Configure how integrations sync and update data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Automatic Daily Sync</Label>
              <p className="text-sm text-muted-foreground">
                Sync all connected integrations daily at 2:00 AM
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="real-time">Real-time Updates</Label>
              <p className="text-sm text-muted-foreground">
                Sync changes immediately as they happen
              </p>
            </div>
            <Switch
              id="real-time"
              checked={realTimeUpdates}
              onCheckedChange={setRealTimeUpdates}
            />
          </div>
        </CardContent>
      </Card>

      {/* Available Integrations */}
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integration.icon;

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {integration.connected && (
                  <>
                    {integration.lastSync && (
                      <div>
                        <p className="text-sm text-muted-foreground">Last Sync</p>
                        <p className="text-sm font-medium">
                          {integration.lastSync.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {integration.usageStats && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {integration.usageStats.label}
                        </p>
                        <p className="text-sm font-medium">{integration.usageStats.value}</p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-2">
                  {integration.connected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigure(integration.id)}
                        className="flex-1"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>

                      {integration.id === 'mailchimp' && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1"
                        >
                          <a href="/sales/marketing/mailchimp">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Dashboard
                          </a>
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disconnect {integration.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the integration and stop syncing data. You can
                              reconnect anytime.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDisconnect(integration.id)}
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleConnect(integration.id)}
                      className="w-full"
                      size="sm"
                    >
                      Connect {integration.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Learn more about integrations and troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="/docs/integrations" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Integration Documentation
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="/docs/api-usage" target="_blank">
              <TrendingUp className="h-4 w-4 mr-2" />
              API Usage and Limits
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
