'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  MapPin,
  User,
  Scan,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { toast } from 'sonner';

interface PickSheetItem {
  id: string;
  pickOrder: number;
  quantity: number;
  isPicked: boolean;
  pickedAt?: string;
  sku: {
    code: string;
    product: {
      name: string;
      brand?: string;
    };
    inventories: Array<{
      location: string;
      aisle?: string;
      row?: number;
      onHand: number;
    }>;
  };
  customer: {
    businessName: string;
    shippingAddress?: string;
    shippingCity?: string;
  };
}

interface PickingInterfaceProps {
  pickSheet: {
    id: string;
    sheetNumber: string;
    status: string;
    pickerName?: string;
    items: PickSheetItem[];
  };
  onUpdateItem: (itemId: string, isPicked: boolean) => Promise<void>;
  onComplete: () => Promise<void>;
}

export function PickingInterface({ pickSheet, onUpdateItem, onComplete }: PickingInterfaceProps) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [processingItem, setProcessingItem] = useState<string | null>(null);

  const sortedItems = [...pickSheet.items].sort((a, b) => a.pickOrder - b.pickOrder);
  const currentItem = sortedItems[currentItemIndex];
  const pickedCount = sortedItems.filter(item => item.isPicked).length;
  const totalCount = sortedItems.length;
  const progressPercent = (pickedCount / totalCount) * 100;

  const handleItemPick = async (itemId: string, isPicked: boolean) => {
    setProcessingItem(itemId);
    try {
      await onUpdateItem(itemId, isPicked);
      toast.success(isPicked ? 'Item picked' : 'Item unmarked');

      // Auto-advance to next unpicked item
      if (isPicked && currentItemIndex < sortedItems.length - 1) {
        const nextUnpicked = sortedItems.findIndex(
          (item, idx) => idx > currentItemIndex && !item.isPicked
        );
        if (nextUnpicked !== -1) {
          setCurrentItemIndex(nextUnpicked);
        }
      }
    } catch (error) {
      toast.error('Failed to update item');
    } finally {
      setProcessingItem(null);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    if (currentItem && barcode === currentItem.sku.code) {
      handleItemPick(currentItem.id, true);
      setScannerOpen(false);
    } else {
      toast.error('Scanned barcode does not match current item');
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success('Printing pick sheet...');
  };

  const handleCompleteSheet = async () => {
    if (pickedCount < totalCount) {
      toast.error('Please pick all items before completing');
      return;
    }

    try {
      await onComplete();
      toast.success('Pick sheet completed!');
    } catch (error) {
      toast.error('Failed to complete pick sheet');
    }
  };

  if (!currentItem) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">All items picked!</h3>
        <p className="text-gray-600 mb-4">Ready to complete this pick sheet</p>
        <Button onClick={handleCompleteSheet} size="lg">
          Complete Pick Sheet
        </Button>
      </div>
    );
  }

  const location = currentItem.sku.inventories[0]?.location || 'Not assigned';

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-gray-600">
            {pickedCount} / {totalCount} items ({Math.round(progressPercent)}%)
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => setScannerOpen(true)}
          className="flex-1"
          size="lg"
        >
          <Scan className="mr-2 h-5 w-5" />
          Scan Barcode
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          size="lg"
        >
          <Printer className="h-5 w-5" />
        </Button>
      </div>

      {/* Current Item Card */}
      <Card className="p-6 border-2 border-blue-500 bg-blue-50/50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
              {currentItem.pickOrder}
            </div>
            <div>
              <div className="text-sm text-gray-600">Current Item</div>
              <div className="font-semibold">Pick Order #{currentItem.pickOrder}</div>
            </div>
          </div>
          <Badge variant={currentItem.isPicked ? 'default' : 'secondary'}>
            {currentItem.isPicked ? 'Picked' : 'Pending'}
          </Badge>
        </div>

        <div className="space-y-4">
          {/* Location */}
          <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-orange-300">
            <MapPin className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-gray-600 font-medium">Location</div>
              <div className="text-2xl font-bold text-orange-600">{location}</div>
              {currentItem.sku.inventories[0]?.aisle && (
                <div className="text-sm text-gray-600 mt-1">
                  Aisle: {currentItem.sku.inventories[0].aisle} |
                  Row: {currentItem.sku.inventories[0].row}
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-gray-600">Product</div>
              <div className="font-semibold">{currentItem.sku.product.name}</div>
              {currentItem.sku.product.brand && (
                <div className="text-sm text-gray-600">{currentItem.sku.product.brand}</div>
              )}
              <div className="text-sm text-gray-600 mt-1">SKU: {currentItem.sku.code}</div>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm text-gray-600">Quantity</div>
              <div className="text-3xl font-bold">{currentItem.quantity}</div>
            </div>
            {currentItem.sku.inventories[0] && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Available</div>
                <div className="text-lg font-semibold">
                  {currentItem.sku.inventories[0].onHand}
                </div>
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-gray-600">Customer</div>
              <div className="font-semibold">{currentItem.customer.businessName}</div>
              {currentItem.customer.shippingCity && (
                <div className="text-sm text-gray-600">
                  {currentItem.customer.shippingCity}
                </div>
              )}
            </div>
          </div>

          {/* Pick Action */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Checkbox
              id={`pick-${currentItem.id}`}
              checked={currentItem.isPicked}
              onCheckedChange={(checked) => handleItemPick(currentItem.id, checked as boolean)}
              disabled={processingItem === currentItem.id}
            />
            <label
              htmlFor={`pick-${currentItem.id}`}
              className="flex-1 text-lg font-medium cursor-pointer"
            >
              Mark as picked
            </label>
            {currentItem.isPicked && currentItem.pickedAt && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {new Date(currentItem.pickedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
          disabled={currentItemIndex === 0}
        >
          Previous
        </Button>

        <div className="text-sm text-gray-600">
          Item {currentItemIndex + 1} of {sortedItems.length}
        </div>

        <Button
          variant="outline"
          onClick={() => setCurrentItemIndex(Math.min(sortedItems.length - 1, currentItemIndex + 1))}
          disabled={currentItemIndex === sortedItems.length - 1}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Remaining Items Summary */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">Remaining Items</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {sortedItems
            .filter(item => !item.isPicked)
            .map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setCurrentItemIndex(sortedItems.indexOf(item))}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  item.id === currentItem.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-gray-500">
                      #{item.pickOrder}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.sku.product.name}</div>
                      <div className="text-xs text-gray-600">
                        {item.sku.inventories[0]?.location || 'No location'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">×{item.quantity}</div>
                </div>
              </button>
            ))}
        </div>
      </Card>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        expectedBarcode={currentItem?.sku.code}
      />
    </div>
  );
}
