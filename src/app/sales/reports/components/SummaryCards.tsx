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
}

interface SummaryCardsProps {
  invoices: Invoice[];
}

export function SummaryCards({ invoices }: SummaryCardsProps) {
  // Calculate summary metrics
  const totalInvoices = invoices.length;

  // Note: The API doesn't return total amounts yet, so we'll show 0 for now
  // This can be enhanced when the API includes financial data
  const totalRevenue = 0;
  const averageOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
}
