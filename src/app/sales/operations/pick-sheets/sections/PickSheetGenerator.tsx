'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PackagePlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ReadyOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
  totalQuantity: number;
  hasLocations: boolean;
  submittedAt: string;
}

interface PickSheetGeneratorProps {
  readyOrders: ReadyOrder[];
  onGenerate: (orderIds: string[], pickerName: string) => Promise<void>;
}

export function PickSheetGenerator({ readyOrders, onGenerate }: PickSheetGeneratorProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [pickerName, setPickerName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAll = () => {
    if (selectedOrders.size === readyOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(readyOrders.map(o => o.id)));
    }
  };

  const selectedOrdersData = readyOrders.filter(o => selectedOrders.has(o.id));
  const totalItems = selectedOrdersData.reduce((sum, o) => sum + o.itemCount, 0);
  const totalQuantity = selectedOrdersData.reduce((sum, o) => sum + o.totalQuantity, 0);
  const hasOrdersWithoutLocations = selectedOrdersData.some(o => !o.hasLocations);

  const handleGenerate = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    if (!pickerName.trim()) {
      toast.error('Please enter picker name');
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate(Array.from(selectedOrders), pickerName.trim());
      setSelectedOrders(new Set());
      setPickerName('');
      toast.success('Pick sheet generated successfully');
    } catch (error) {
      toast.error('Failed to generate pick sheet');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PackagePlus className="mr-2 h-5 w-5" />
          Generate Pick Sheet
        </CardTitle>
      </CardHeader>
      <CardContent>
        {readyOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No orders ready for picking. Orders must be in SUBMITTED status.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Picker Name Input */}
            <div>
              <Label htmlFor="pickerName">Picker Name</Label>
              <Input
                id="pickerName"
                value={pickerName}
                onChange={(e) => setPickerName(e.target.value)}
                placeholder="Enter picker name..."
                className="mt-1 touch-target"
              />
            </div>

            {/* Select All */}
            <div className="flex items-center space-x-2 border-b pb-3">
              <Checkbox
                checked={selectedOrders.size === readyOrders.length}
                onCheckedChange={toggleAll}
                className="h-5 w-5"
              />
              <Label className="text-base font-semibold cursor-pointer" onClick={toggleAll}>
                Select All ({readyOrders.length} orders)
              </Label>
            </div>

            {/* Ready Orders List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleOrder(order.id)}
                >
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={() => toggleOrder(order.id)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{order.orderNumber}</span>
                      <span className="text-sm text-gray-600">
                        {order.itemCount} items ({order.totalQuantity} units)
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-600">{order.customerName}</span>
                      {!order.hasLocations && (
                        <span className="text-xs text-amber-600 flex items-center">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Missing locations
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {selectedOrders.size > 0 && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Selected Orders:</span>
                  <span className="font-semibold">{selectedOrders.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Items:</span>
                  <span className="font-semibold">{totalItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Quantity:</span>
                  <span className="font-semibold">{totalQuantity}</span>
                </div>

                {hasOrdersWithoutLocations && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                    <AlertCircle className="inline mr-2 h-4 w-4" />
                    Some orders have items without warehouse locations
                  </div>
                )}
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={selectedOrders.size === 0 || !pickerName.trim() || isGenerating}
              className="w-full touch-target"
              size="lg"
            >
              <PackagePlus className="mr-2 h-5 w-5" />
              {isGenerating ? 'Generating...' : `Generate Pick Sheet (${selectedOrders.size} orders)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
