'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Invoice {
  id: string;
  referenceNumber: string;
  date: string;
  customerName: string;
  deliveryMethod: string;
  status: string;
  invoiceType: string;
}

interface ExportButtonProps {
  invoices: Invoice[];
  filters: {
    deliveryMethod: string | null;
    startDate: string | null;
    endDate: string | null;
  };
}

export function ExportButton({ invoices, filters }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const generateCSV = () => {
    // CSV Headers
    const headers = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Delivery Method',
      'Invoice Type',
      'Status',
    ];

    // CSV Rows
    const rows = invoices.map((invoice) => [
      invoice.referenceNumber,
      formatDate(invoice.date),
      invoice.customerName,
      invoice.deliveryMethod,
      invoice.invoiceType,
      invoice.status,
    ]);

    // Escape CSV values (handle commas and quotes)
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    return csvContent;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const csv = generateCSV();
      const timestamp = new Date().toISOString().split('T')[0];
      const filterSuffix = filters.deliveryMethod
        ? `-${filters.deliveryMethod.replace(/\s+/g, '-').toLowerCase()}`
        : '';
      const filename = `delivery-report${filterSuffix}-${timestamp}.csv`;
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      // For Excel, we'll use the same CSV format but with .xlsx extension
      // In a production app, you'd use a library like xlsx or exceljs
      const csv = generateCSV();
      const timestamp = new Date().toISOString().split('T')[0];
      const filterSuffix = filters.deliveryMethod
        ? `-${filters.deliveryMethod.replace(/\s+/g, '-').toLowerCase()}`
        : '';
      const filename = `delivery-report${filterSuffix}-${timestamp}.csv`;
      downloadFile(csv, filename, 'application/vnd.ms-excel');
    } finally {
      setIsExporting(false);
    }
  };

  if (invoices.length === 0) {
    return (
      <Button disabled variant="outline">
        <Download className="h-4 w-4" />
        No Data to Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <>
              <Download className="h-4 w-4 animate-pulse" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export ({invoices.length})
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4" />
          Export for Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
