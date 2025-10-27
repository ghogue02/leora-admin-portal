'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PickItemRowProps {
  item: {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    customerName: string;
    location?: {
      aisle: string;
      row: string;
      shelf: string;
    };
    picked: boolean;
    pickedAt?: string;
    pickOrder?: number;
  };
  onToggle?: (itemId: string, picked: boolean) => void;
  disabled?: boolean;
}

export function PickItemRow({ item, onToggle, disabled }: PickItemRowProps) {
  const locationDisplay = item.location
    ? `${item.location.aisle}-${item.location.row}-${item.location.shelf}`
    : 'No Location';

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b hover:bg-gray-50 transition-colors',
        item.picked && 'bg-green-50'
      )}
    >
      {/* Checkbox - Large touch target */}
      <div className="flex-shrink-0">
        <Checkbox
          checked={item.picked}
          onCheckedChange={(checked) => onToggle?.(item.id, checked as boolean)}
          disabled={disabled}
          className="h-6 w-6 touch-target"
        />
      </div>

      {/* Location - Prominent for warehouse picking */}
      <div className="w-24 flex-shrink-0">
        <div className="text-lg font-mono font-bold">{locationDisplay}</div>
        {item.pickOrder && (
          <div className="text-xs text-gray-500">#{item.pickOrder}</div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{item.productName}</div>
        <div className="text-sm text-gray-600 font-mono">{item.sku}</div>
      </div>

      {/* Quantity */}
      <div className="w-20 text-center">
        <div className="text-xl font-bold">{item.quantity}</div>
        <div className="text-xs text-gray-500">qty</div>
      </div>

      {/* Customer */}
      <div className="w-40 hidden md:block">
        <div className="text-sm truncate">{item.customerName}</div>
      </div>

      {/* Status/Action */}
      <div className="w-32 flex-shrink-0">
        {item.picked ? (
          <div className="flex items-center text-green-600">
            <Check className="mr-2 h-5 w-5" />
            <div>
              <div className="text-sm font-semibold">Picked</div>
              {item.pickedAt && (
                <div className="text-xs">
                  {new Date(item.pickedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Button
            onClick={() => onToggle?.(item.id, true)}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="w-full touch-target"
          >
            Mark Picked
          </Button>
        )}
      </div>
    </div>
  );
}
