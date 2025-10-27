'use client';

import { useState } from 'react';
import { SalesSheetBuilder } from './_components/SalesSheetBuilder';

export default function SalesSheetsPage() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          Sales Tools
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">Sales Sheet Builder</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Create professional sales sheets with product information, tasting notes, and pricing.
          Select products, customize layouts, and generate PDFs ready to share with customers.
        </p>
      </header>

      <SalesSheetBuilder />
    </main>
  );
}
