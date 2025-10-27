'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Eye
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MailchimpStatusProps {
  customerId: string;
  customerEmail?: string;
}

interface CampaignHistory {
  id: string;
  name: string;
  sentDate: Date;
  opened: boolean;
  clicked: boolean;
  converted: boolean;
}

export function MailchimpStatus({ customerId, customerEmail }: MailchimpStatusProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isOptedIn, setIsOptedIn] = useState(true);
  const [campaignHistory, setCampaignHistory] = useState<CampaignHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMailchimpStatus();
  }, [customerId]);

  const loadMailchimpStatus = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/mailchimp`);
      const data = await response.json();
      setIsSubscribed(data.subscribed);
      setIsOptedIn(data.optedIn);
      setCampaignHistory(data.campaigns || []);
    } catch (error) {
      console.error('Failed to load Mailchimp status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptInChange = async (opted: boolean) => {
    setIsSaving(true);
    try {
      await fetch(`/api/customers/${customerId}/mailchimp/opt-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optedIn: opted }),
      });
      setIsOptedIn(opted);
    } catch (error) {
      console.error('Failed to update opt-in status:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const stats = {
    totalSent: campaignHistory.length,
    opened: campaignHistory.filter(c => c.opened).length,
    clicked: campaignHistory.filter(c => c.clicked).length,
    converted: campaignHistory.filter(c => c.converted).length,
  };

  const openRate = stats.totalSent > 0 ? (stats.opened / stats.totalSent) * 100 : 0;
  const clickRate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Marketing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Marketing
          </CardTitle>
          {isSubscribed ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Subscribed
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Not Subscribed
            </Badge>
          )}
        </div>
        <CardDescription>
          {customerEmail || 'No email address on file'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Opt-in Control */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label htmlFor="email-opt-in">Email Opt-in</Label>
            <p className="text-sm text-muted-foreground">
              Allow sending marketing emails
            </p>
          </div>
          <Switch
            id="email-opt-in"
            checked={isOptedIn}
            onCheckedChange={handleOptInChange}
            disabled={isSaving}
          />
        </div>

        {/* Engagement Stats */}
        {stats.totalSent > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Campaigns</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalSent}</p>
            </div>

            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Open Rate</span>
              </div>
              <p className="text-2xl font-bold">{openRate.toFixed(0)}%</p>
            </div>

            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Click Rate</span>
              </div>
              <p className="text-2xl font-bold">{clickRate.toFixed(0)}%</p>
            </div>

            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Converted</span>
              </div>
              <p className="text-2xl font-bold">{stats.converted}</p>
            </div>
          </div>
        )}

        {/* Campaign History */}
        {campaignHistory.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                View Campaign History ({campaignHistory.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Campaign History</DialogTitle>
                <DialogDescription>
                  Emails sent to this customer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {campaignHistory.map((campaign) => (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{campaign.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {new Date(campaign.sentDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {campaign.opened && (
                        <Badge variant="outline" className="text-xs">
                          Opened
                        </Badge>
                      )}
                      {campaign.clicked && (
                        <Badge variant="outline" className="text-xs">
                          Clicked
                        </Badge>
                      )}
                      {campaign.converted && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          Converted
                        </Badge>
                      )}
                      {!campaign.opened && !campaign.clicked && !campaign.converted && (
                        <Badge variant="secondary" className="text-xs">
                          No engagement
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {stats.totalSent === 0 && isOptedIn && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No campaigns sent yet
          </p>
        )}

        {!isOptedIn && (
          <p className="text-sm text-yellow-600 text-center py-4">
            Customer has opted out of email marketing
          </p>
        )}
      </CardContent>
    </Card>
  );
}
