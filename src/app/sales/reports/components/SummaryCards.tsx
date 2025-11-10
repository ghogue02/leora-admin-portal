'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, TrendingUp } from 'lucide-react';

interface Invoice {
  id: string;
  referenceNumber: string;
  date: string;
  customerName: string;
  deliveryMethod: string;
  status: string;
  invoiceType: string;
  total?: string; // Added total field from API
}

interface SummaryCardsProps {
  invoices: Invoice[];
  metrics?: {
    totalInvoices: number;
    totalRevenue: number;
    averageOrderValue: number;
    scheduledRate?: number;
  };
}

export function SummaryCards({ invoices, metrics }: SummaryCardsProps) {
  // Calculate summary metrics
  const totalInvoices = metrics?.totalInvoices ?? invoices.length;

  // Calculate total revenue from invoice totals
  const fallbackRevenue = invoices.reduce((sum, invoice) => {
    const amount = parseFloat(invoice.total || '0');
    return sum + amount;
  }, 0);
  const totalRevenue = metrics?.totalRevenue ?? fallbackRevenue;

  const averageOrderValue =
    metrics?.averageOrderValue ?? (totalInvoices > 0 ? totalRevenue / totalInvoices : 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Total Invoices Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalInvoices.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Invoices in selected period
          </p>
        </CardContent>
      </Card>

      {/* Total Revenue Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalInvoices > 0 ? 'Sum of all invoices' : 'No data available'}
          </p>
        </CardContent>
      </Card>

      {/* Average Order Value Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Order</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(averageOrderValue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalInvoices > 0 ? 'Per invoice average' : 'No data available'}
          </p>
        </CardContent>
      </Card>

      {typeof metrics?.scheduledRate === 'number' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Deliveries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.scheduledRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Invoices with delivery dates</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
