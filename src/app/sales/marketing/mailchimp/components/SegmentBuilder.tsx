'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Users, Filter, Target, Calendar } from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  type: 'ACTIVE' | 'TARGET' | 'PROSPECT' | 'CUSTOM';
  customerCount: number;
  lastUpdated: Date;
}

interface SegmentBuilderProps {
  segments: Segment[];
  onSegmentCreated: () => void;
}

interface SegmentFilters {
  accountType?: 'ACTIVE' | 'TARGET' | 'PROSPECT';
  territory?: string;
  minimumOrders?: number;
  lastOrderDays?: number;
  totalSpendMin?: number;
  hasEmailOptIn?: boolean;
}

export function SegmentBuilder({ segments, onSegmentCreated }: SegmentBuilderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [filters, setFilters] = useState<SegmentFilters>({});
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const updateFilter = (key: keyof SegmentFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    estimateCustomerCount(newFilters);
  };

  const estimateCustomerCount = async (currentFilters: SegmentFilters) => {
    try {
      const response = await fetch('/api/customers/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentFilters),
      });
      const { count } = await response.json();
      setEstimatedCount(count);
    } catch (error) {
      console.error('Failed to estimate count:', error);
    }
  };

  const handleCreateSegment = async () => {
    if (!segmentName) return;

    setIsCreating(true);
    try {
      await fetch('/api/mailchimp/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: segmentName,
          filters,
        }),
      });

      setIsDialogOpen(false);
      setSegmentName('');
      setFilters({});
      setEstimatedCount(0);
      onSegmentCreated();
    } catch (error) {
      console.error('Failed to create segment:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getSegmentTypeColor = (type: Segment['type']) => {
    switch (type) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'TARGET':
        return 'bg-blue-500';
      case 'PROSPECT':
        return 'bg-yellow-500';
      case 'CUSTOM':
        return 'bg-purple-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Segment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Segment
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Customer Segment</DialogTitle>
            <DialogDescription>
              Build a custom segment based on customer criteria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="segment-name">Segment Name</Label>
              <Input
                id="segment-name"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                placeholder="e.g., High Value Wine Buyers"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="account-type">Account Type</Label>
                <Select
                  value={filters.accountType}
                  onValueChange={(value: any) => updateFilter('accountType', value)}
                >
                  <SelectTrigger id="account-type">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="TARGET">Target</SelectItem>
                    <SelectItem value="PROSPECT">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="territory">Territory</Label>
                <Select
                  value={filters.territory}
                  onValueChange={(value) => updateFilter('territory', value)}
                >
                  <SelectTrigger id="territory">
                    <SelectValue placeholder="All territories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">North</SelectItem>
                    <SelectItem value="south">South</SelectItem>
                    <SelectItem value="east">East</SelectItem>
                    <SelectItem value="west">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="min-orders">Minimum Orders</Label>
                <Input
                  id="min-orders"
                  type="number"
                  value={filters.minimumOrders || ''}
                  onChange={(e) => updateFilter('minimumOrders', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 5"
                />
              </div>

              <div>
                <Label htmlFor="last-order">Last Order (days ago)</Label>
                <Input
                  id="last-order"
                  type="number"
                  value={filters.lastOrderDays || ''}
                  onChange={(e) => updateFilter('lastOrderDays', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 30"
                />
              </div>

              <div>
                <Label htmlFor="min-spend">Minimum Total Spend ($)</Label>
                <Input
                  id="min-spend"
                  type="number"
                  value={filters.totalSpendMin || ''}
                  onChange={(e) => updateFilter('totalSpendMin', parseFloat(e.target.value) || undefined)}
                  placeholder="e.g., 1000"
                />
              </div>

              <div>
                <Label htmlFor="email-opt-in">Email Opt-In</Label>
                <Select
                  value={filters.hasEmailOptIn?.toString()}
                  onValueChange={(value) => updateFilter('hasEmailOptIn', value === 'true')}
                >
                  <SelectTrigger id="email-opt-in">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Opted in only</SelectItem>
                    <SelectItem value="false">Not opted in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">Estimated Match</span>
              </div>
              <p className="text-2xl font-bold">{estimatedCount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">customers match these criteria</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSegment} disabled={!segmentName || isCreating}>
              {isCreating ? 'Creating...' : 'Create in Mailchimp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing Segments */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.map((segment) => (
          <Card key={segment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{segment.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <Badge variant="secondary" className={getSegmentTypeColor(segment.type)}>
                      {segment.type}
                    </Badge>
                  </CardDescription>
                </div>
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Customer Count</span>
                </div>
                <p className="text-2xl font-bold">{segment.customerCount.toLocaleString()}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Updated {new Date(segment.lastUpdated).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={`/sales/marketing/mailchimp/campaigns/new?segment=${segment.id}`}>
                    <Filter className="h-4 w-4 mr-1" />
                    Use in Campaign
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {segments.length === 0 && (
        <div className="text-center py-12 border rounded-lg">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No segments yet</h3>
          <p className="text-muted-foreground mb-4">
            Create custom segments to target specific customer groups
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Segment
          </Button>
        </div>
      )}
    </div>
  );
}
