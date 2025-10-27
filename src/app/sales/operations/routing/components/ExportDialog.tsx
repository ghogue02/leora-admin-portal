'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string;
  territory?: string;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
}

export function ExportDialog({ open, onOpenChange, orders }: ExportDialogProps) {
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const territories = Array.from(new Set(orders.map(o => o.territory).filter(Boolean))) as string[];

  const filteredOrders = orders.filter(o =>
    territoryFilter === 'all' || o.territory === territoryFilter
  );

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
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleExport = () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    // Generate Azuga CSV format
    const selectedOrderData = orders.filter(o => selectedOrders.has(o.id));

    const headers = [
      'Order Number',
      'Customer Name',
      'Address',
      'Delivery Date',
      'Territory',
      'Notes'
    ];

    const rows = selectedOrderData.map(order => [
      order.orderNumber,
      order.customerName,
      order.address,
      deliveryDate,
      order.territory || '',
      ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `azuga-routes-${deliveryDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedOrders.size} orders to Azuga format`);
    onOpenChange(false);
    setSelectedOrders(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Routes to Azuga</DialogTitle>
          <DialogDescription>
            Select orders to export for route optimization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Delivery Date */}
          <div>
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="pl-10 touch-target"
              />
            </div>
          </div>

          {/* Territory Filter */}
          {territories.length > 0 && (
            <div>
              <Label>Filter by Territory</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant={territoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTerritoryFilter('all')}
                >
                  All
                </Button>
                {territories.map(t => (
                  <Button
                    key={t}
                    variant={territoryFilter === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTerritoryFilter(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Select All */}
          <div className="flex items-center space-x-2 border-b pb-3">
            <Checkbox
              checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
              onCheckedChange={toggleAll}
              className="h-5 w-5"
            />
            <Label className="text-base font-semibold cursor-pointer" onClick={toggleAll}>
              Select All ({filteredOrders.length} orders)
            </Label>
          </div>

          {/* Orders List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No orders available for export
              </div>
            ) : (
              filteredOrders.map(order => (
                <div
                  key={order.id}
                  className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleOrder(order.id)}
                >
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={() => toggleOrder(order.id)}
                    className="h-5 w-5 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{order.orderNumber}</span>
                      {order.territory && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {order.territory}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{order.customerName}</div>
                    <div className="text-xs text-gray-500 mt-1">{order.address}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {selectedOrders.size > 0 && (
            <div className="border-t pt-3 bg-blue-50 p-3 rounded">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Selected Orders:</span>
                <span className="font-bold">{selectedOrders.size}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="font-semibold">Delivery Date:</span>
                <span className="font-bold">{new Date(deliveryDate).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={selectedOrders.size === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV ({selectedOrders.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
