'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ExternalLink, Search } from 'lucide-react';
import { ValidationError } from './ValidationPanel';
import Link from 'next/link';

export interface ErrorTableProps {
  errors: ValidationError[];
  onFixError?: (error: ValidationError) => void;
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  MISSING_CUSTOMER_CODE: 'Missing Customer Code',
  MISSING_SKU_CODE: 'Missing SKU Code',
  INVALID_AMOUNT: 'Invalid Amount',
  DUPLICATE_INVOICE: 'Duplicate Invoice',
};

const ERROR_TYPE_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  MISSING_CUSTOMER_CODE: 'destructive',
  MISSING_SKU_CODE: 'destructive',
  INVALID_AMOUNT: 'secondary',
  DUPLICATE_INVOICE: 'outline',
};

type SortField = 'type' | 'invoice' | 'customer';
type SortOrder = 'asc' | 'desc';

export function ErrorTable({ errors, onFixError }: ErrorTableProps) {
  const [sortField, setSortField] = React.useState<SortField>('type');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');
  const [filterType, setFilterType] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredAndSortedErrors = React.useMemo(() => {
    let filtered = errors;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((error) => error.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (error) =>
          error.message.toLowerCase().includes(query) ||
          error.invoiceNumber?.toLowerCase().includes(query) ||
          error.customerName?.toLowerCase().includes(query) ||
          error.skuCode?.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'invoice':
          aValue = a.invoiceNumber || '';
          bValue = b.invoiceNumber || '';
          break;
        case 'customer':
          aValue = a.customerName || '';
          bValue = b.customerName || '';
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [errors, sortField, sortOrder, filterType, searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getFixUrl = (error: ValidationError): string | null => {
    if (error.customerName) {
      return `/admin/customers?search=${encodeURIComponent(error.customerName)}`;
    }
    if (error.skuCode) {
      return `/admin/inventory?search=${encodeURIComponent(error.skuCode)}`;
    }
    if (error.invoiceNumber) {
      return `/admin/orders?search=${encodeURIComponent(error.invoiceNumber)}`;
    }
    return null;
  };

  const uniqueErrorTypes = React.useMemo(
    () => Array.from(new Set(errors.map((e) => e.type))),
    [errors]
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search errors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search errors"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by error type">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueErrorTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {ERROR_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedErrors.length} of {errors.length} errors
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('type')}
                  className="h-8 px-2"
                  aria-sort={sortField === 'type' ? sortOrder : 'none'}
                >
                  Type
                  {sortField === 'type' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>Message</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('invoice')}
                  className="h-8 px-2"
                  aria-sort={sortField === 'invoice' ? sortOrder : 'none'}
                >
                  Invoice #
                  {sortField === 'invoice' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('customer')}
                  className="h-8 px-2"
                  aria-sort={sortField === 'customer' ? sortOrder : 'none'}
                >
                  Customer
                  {sortField === 'customer' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedErrors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No errors found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedErrors.map((error, index) => {
                const fixUrl = getFixUrl(error);
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={ERROR_TYPE_VARIANTS[error.type] ?? 'secondary'}>
                        {ERROR_TYPE_LABELS[error.type] ?? error.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={error.message}>
                      {error.message}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {error.invoiceNumber || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={error.customerName || undefined}>
                      {error.customerName || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {error.skuCode || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {fixUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          aria-label={`Fix ${ERROR_TYPE_LABELS[error.type]}`}
                        >
                          <Link href={fixUrl}>
                            Fix
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </Link>
                        </Button>
                      ) : (
                        onFixError && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onFixError(error)}
                            aria-label={`Fix ${ERROR_TYPE_LABELS[error.type]}`}
                          >
                            Fix
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
