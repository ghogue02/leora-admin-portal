'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  Eye,
  Mail,
  MoreVertical,
  TrendingUp,
  Users,
  MousePointerClick
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'scheduled':
        return 'bg-blue-500';
      case 'sent':
        return 'bg-green-500';
    }
  };

  const getStatusLabel = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'scheduled':
        return 'Scheduled';
      case 'sent':
        return 'Sent';
    }
  };

  const openRate = campaign.recipientCount > 0
    ? (campaign.opens / campaign.recipientCount) * 100
    : 0;

  const clickRate = campaign.opens > 0
    ? (campaign.clicks / campaign.opens) * 100
    : 0;

  const conversionRate = campaign.clicks > 0
    ? (campaign.conversions / campaign.clicks) * 100
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={getStatusColor(campaign.status)}>
                {getStatusLabel(campaign.status)}
              </Badge>
            </div>
            <CardTitle className="text-lg line-clamp-2">{campaign.name}</CardTitle>
            {campaign.sentDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Sent {new Date(campaign.sentDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Report
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {campaign.status === 'draft' && (
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Continue Editing
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipients */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Recipients</span>
          </div>
          <span className="font-medium">{campaign.recipientCount.toLocaleString()}</span>
        </div>

        {campaign.status === 'sent' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{openRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Opens</p>
              </div>

              <div className="text-center border-l">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{clickRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Clicks</p>
              </div>

              <div className="text-center border-l">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Conv.</p>
              </div>
            </div>

            {/* Performance Indicator */}
            <div className="pt-2">
              {openRate >= 20 ? (
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Above average performance
                </div>
              ) : openRate >= 10 ? (
                <div className="text-sm text-yellow-600">Average performance</div>
              ) : (
                <div className="text-sm text-red-600">Below average performance</div>
              )}
            </div>
          </>
        )}

        {campaign.status === 'draft' && (
          <Button className="w-full" asChild>
            <a href={`/sales/marketing/mailchimp/campaigns/${campaign.id}/edit`}>
              Continue Editing
            </a>
          </Button>
        )}

        {campaign.status === 'scheduled' && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Scheduled to send on {campaign.sentDate?.toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
