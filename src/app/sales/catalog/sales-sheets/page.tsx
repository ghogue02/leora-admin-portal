'use client';

import { useState } from 'react';
import { SalesSheetBuilder } from './_components/SalesSheetBuilder';

export default function SalesSheetsPage() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <SalesSheetBuilder />
    </main>
  );
}
