'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function WarehousePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Warehouse Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            The warehouse management interface is currently being updated.
            Please check back soon.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            If you need immediate access to warehouse features, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
