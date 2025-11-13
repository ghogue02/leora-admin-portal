'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, MapPin, Edit, Upload, Download, Plus } from 'lucide-react';
import {
  ResponsiveCard,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
  ResponsiveCardDescription,
} from '@/components/ui/responsive-card';
import { toast } from 'sonner';
import { formatUTCDate } from '@/lib/dates';

interface InventoryLocation {
  id: string;
  location: string;
  aisle?: string;
  row?: number;
  onHand: number;
  allocated: number;
  sku: {
    code: string;
    product: {
      name: string;
      brand?: string;
    };
  };
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);
  const [newLocation, setNewLocation] = useState('');

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/operations/locations');
      if (!response.ok) throw new Error('Failed to load locations');
      const data = (await response.json()) as { inventories?: InventoryLocation[] };
      setLocations(data.inventories ?? []);
    } catch (error) {
      console.error('Failed to load locations', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const handleUpdateLocation = useCallback(
    async (skuId: string, location: string) => {
      if (!location.match(/^[A-Z]\d+-[A-Z]?\d+-[A-Z]?\d+$/)) {
        toast.error('Invalid location format. Use: A1-B2-S3');
        return;
      }
      const [aisle, bay] = location.split('-');
      try {
        const response = await fetch('/api/operations/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skuId,
            location,
            aisle,
            row: parseInt(bay, 10) || undefined,
          }),
        });
        if (!response.ok) throw new Error('Failed to update location');
        toast.success('Location updated successfully');
        setEditingLocation(null);
        setNewLocation('');
        void fetchLocations();
      } catch (error) {
        console.error('Failed to update location', error);
        toast.error('Failed to update location');
      }
    },
    [fetchLocations],
  );

  const handleBulkUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        try {
          const csv = loadEvent.target?.result as string;
          const lines = csv.split('\n');
          const updates = [];
          for (let i = 1; i < lines.length; i += 1) {
            const [skuCode, location, aisle, row] = lines[i].split(',').map((s) => s.trim());
            if (skuCode && location) {
              updates.push({
                skuId: skuCode,
                location,
                aisle,
                row: row ? parseInt(row, 10) : undefined,
              });
            }
          }
          const response = await fetch('/api/operations/locations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates }),
          });
          if (!response.ok) throw new Error('Failed to upload locations');
          const result = await response.json();
          toast.success(`Updated ${result.success} locations`);
          if (result.failed > 0) {
            toast.warning(`Failed to update ${result.failed} locations`);
          }
          void fetchLocations();
        } catch (error) {
          console.error('Failed to process CSV file', error);
          toast.error('Failed to process CSV file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [fetchLocations]);

  const handleExportLocations = useCallback(() => {
    const csv = [
      'SKU Code,Location,Aisle,Row,On Hand,Allocated,Product Name',
      ...locations.map((inv) =>
        [
          inv.sku.code,
          inv.location,
          inv.aisle || '',
          inv.row || '',
          inv.onHand,
          inv.allocated,
          inv.sku.product.name,
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-locations-${formatUTCDate(new Date())}.csv`;
    a.click();
    toast.success('Locations exported');
  }, [locations]);

  const filteredLocations = useMemo(
    () =>
      locations.filter(
        (inv) =>
          inv.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.sku.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.sku.product.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [locations, searchTerm],
  );

  const groupedByLocation = useMemo(() => {
    return filteredLocations.reduce<Record<string, InventoryLocation[]>>((acc, inv) => {
      const loc = inv.location || 'Unassigned';
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(inv);
      return acc;
    }, {});
  }, [filteredLocations]);

  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Warehouse
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Inventory locations</h1>
          <p className="text-sm text-gray-600">
            Manage bin assignments and track on-hand vs allocated inventory.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleBulkUpload} variant="outline" className="touch-target">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={handleExportLocations} variant="outline" className="touch-target">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </header>

      <ResponsiveCard className="p-4 shadow-sm">
        <ResponsiveCardHeader className="mb-4">
          <ResponsiveCardTitle>Search & Assign Locations</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Filter bins or assign new locations without leaving the page.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search SKU, location, or product"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
          <Dialog open={!!editingLocation} onOpenChange={() => setEditingLocation(null)}>
            <DialogTrigger asChild>
              <Button variant="outline" className="touch-target">
                <Plus className="mr-2 h-4 w-4" />
                Assign Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Assign Location {editingLocation && `for ${editingLocation.sku.product.name}`}
                </DialogTitle>
              </DialogHeader>
              <Input
                placeholder="A1-B2-S3"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingLocation(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    editingLocation && handleUpdateLocation(editingLocation.id, newLocation)
                  }
                >
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ResponsiveCard>

      {loading ? (
        <section className="surface-card p-10 text-center text-gray-500 shadow-sm">
          Loading locations...
        </section>
      ) : Object.keys(groupedByLocation).length === 0 ? (
        <section className="surface-card border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500 shadow-sm">
          No locations found.
        </section>
      ) : (
        <section className="space-y-4">
          {Object.entries(groupedByLocation).map(([location, inventories]) => (
            <ResponsiveCard key={location} className="p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">{location}</h2>
                  </div>
                  <p className="text-xs text-gray-500">
                    {inventories.length} SKU{inventories.length !== 1 ? 's' : ''} in this bin
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingLocation({
                      ...inventories[0],
                      id: inventories[0].sku.code,
                    });
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Update Location
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventories.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.sku.code}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{inv.sku.product.name}</div>
                        {inv.sku.product.brand && (
                          <div className="text-xs text-gray-500">{inv.sku.product.brand}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-gray-900">
                        {inv.onHand}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {inv.allocated}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveCard>
          ))}
        </section>
      )}
    </main>
  );
}
