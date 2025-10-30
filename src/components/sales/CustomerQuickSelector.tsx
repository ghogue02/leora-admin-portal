/**
 * Customer Quick Selector
 *
 * Shows currently selected customer for cart and provides quick access to change
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { User, ChevronRight } from 'lucide-react';

interface CustomerQuickSelectorProps {
  selectedCustomer?: {
    id: string;
    name: string;
    state?: string | null;
  } | null;
  className?: string;
}

export function CustomerQuickSelector({ selectedCustomer, className = '' }: CustomerQuickSelectorProps) {
  if (!selectedCustomer) {
    return (
      <Link
        href="/sales/customers"
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100 transition-colors ${className}`}
      >
        <User className="w-4 h-4" />
        <span>Select a Customer</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <Link
      href="/sales/customers"
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${className}`}
    >
      <User className="w-4 h-4 text-green-600" />
      <div className="flex flex-col items-start">
        <span className="text-xs text-gray-500">Selected Customer:</span>
        <span className="font-semibold">{selectedCustomer.name}</span>
        {selectedCustomer.state && (
          <span className="text-xs text-gray-500">{selectedCustomer.state}</span>
        )}
      </div>
      <ChevronRight className="w-4 h-4" />
    </Link>
  );
}
