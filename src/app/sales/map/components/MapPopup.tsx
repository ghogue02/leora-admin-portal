'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, MapPin, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  accountType: 'ACTIVE' | 'TARGET' | 'PROSPECT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  revenue: number;
  lastOrderDate: string | null;
  phone: string;
}

interface MapPopupProps {
  customer: Customer;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getAccountTypeBadge = (type: Customer['accountType']) => {
  switch (type) {
    case 'ACTIVE':
      return <Badge className="bg-green-500">Active</Badge>;
    case 'TARGET':
      return <Badge className="bg-yellow-500">Target</Badge>;
    case 'PROSPECT':
      return <Badge className="bg-gray-400">Prospect</Badge>;
  }
};

const getPriorityBadge = (priority: Customer['priority']) => {
  switch (priority) {
    case 'HIGH':
      return <Badge variant="destructive">High Priority</Badge>;
    case 'MEDIUM':
      return <Badge variant="secondary">Medium Priority</Badge>;
    case 'LOW':
      return <Badge variant="outline">Low Priority</Badge>;
  }
};

export default function MapPopup({ customer }: MapPopupProps) {
  return (
    <div className="min-w-[280px] max-w-[320px] p-2">
      {/* Header */}
      <div className="space-y-2 mb-3">
        <h3 className="font-bold text-base line-clamp-2">{customer.name}</h3>
        <div className="flex flex-wrap gap-2">
          {getAccountTypeBadge(customer.accountType)}
          {getPriorityBadge(customer.priority)}
        </div>
      </div>

      <Separator className="my-3" />

      {/* Details */}
      <div className="space-y-3 text-sm">
        {/* Address */}
        <div className="flex gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            <div>{customer.address}</div>
            <div>
              {customer.city}, {customer.state} {customer.zip}
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
          <a
            href={`tel:${customer.phone}`}
            className="text-primary hover:underline"
          >
            {customer.phone}
          </a>
        </div>

        {/* Last Order */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Last Order: {formatDate(customer.lastOrderDate)}
          </span>
        </div>

        {/* Revenue */}
        {customer.accountType === 'ACTIVE' && (
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-xs text-muted-foreground">Annual Revenue</div>
            <div className="font-bold text-base">{formatCurrency(customer.revenue)}</div>
          </div>
        )}
      </div>

      <Separator className="my-3" />

      {/* Quick Actions */}
      <div className="space-y-2">
        <Link href={`/sales/customers/${customer.id}`}>
          <Button variant="outline" className="w-full" size="sm">
            <ExternalLink className="h-3 w-3 mr-2" />
            View Details
          </Button>
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">
            Call Plan
          </Button>
          <Button variant="outline" size="sm">
            Assign Sample
          </Button>
        </div>
      </div>
    </div>
  );
}
