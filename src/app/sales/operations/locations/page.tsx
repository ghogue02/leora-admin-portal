'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';

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

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/operations/locations');
      const data = await response.json();
      setLocations(data.inventories || []);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (skuId: string, location: string) => {
    if (!location.match(/^[A-Z]\d+-[A-Z]?\d+-[A-Z]?\d+$/)) {
      toast.error('Invalid location format. Use: A1-B2-S3');
      return;
    }

    const [aisle, bay, shelf] = location.split('-');

    try {
      const response = await fetch('/api/operations/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuId,
          location,
          aisle,
          row: parseInt(bay) || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update location');

      toast.success('Location updated successfully');
      fetchLocations();
      setEditingLocation(null);
      setNewLocation('');
    } catch (error) {
      toast.error('Failed to update location');
    }
  };

  const handleBulkUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n');
          const updates = [];

          // Skip header row
          for (let i = 1; i < lines.length; i++) {
            const [skuCode, location, aisle, row] = lines[i].split(',').map(s => s.trim());
            if (skuCode && location) {
              updates.push({
                skuId: skuCode, // In production, lookup SKU ID by code
                location,
                aisle,
                row: row ? parseInt(row) : undefined,
              });
            }
          }

          const response = await fetch('/api/operations/locations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates }),
          });

          const result = await response.json();
          toast.success(`Updated ${result.success} locations`);
          if (result.failed > 0) {
            toast.warning(`Failed to update ${result.failed} locations`);
          }
          fetchLocations();
        } catch (error) {
          toast.error('Failed to process CSV file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportLocations = () => {
    const csv = [
      'SKU Code,Location,Aisle,Row,On Hand,Allocated,Product Name',
      ...locations.map(inv =>
        [
          inv.sku.code,
          inv.location,
          inv.aisle || '',
          inv.row || '',
          inv.onHand,
          inv.allocated,
          inv.sku.product.name,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-locations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Locations exported');
  };

  const filteredLocations = locations.filter(inv =>
    inv.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.sku.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.sku.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByLocation = filteredLocations.reduce((acc, inv) => {
    const loc = inv.location || 'Unassigned';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(inv);
    return acc;
  }, {} as Record<string, InventoryLocation[]>);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Locations</h1>
          <p className="text-gray-600 mt-1">Manage inventory locations and warehouse layout</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button onClick={handleBulkUpload} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={handleExportLocations} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600 font-semibold">Total Items</div>
          <div className="text-2xl font-bold">{locations.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 font-semibold">Unique Locations</div>
          <div className="text-2xl font-bold">{Object.keys(groupedByLocation).length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 font-semibold">Total On Hand</div>
          <div className="text-2xl font-bold">
            {locations.reduce((sum, inv) => sum + inv.onHand, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 font-semibold">Total Allocated</div>
          <div className="text-2xl font-bold">
            {locations.reduce((sum, inv) => sum + inv.allocated, 0)}
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by location, SKU, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Location Format Guide */}
      <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-900">Location Format</div>
            <div className="text-sm text-blue-700 mt-1">
              Use format: <span className="font-mono font-bold">Aisle-Bay-Shelf</span>
              <br />
              Example: <span className="font-mono font-bold">A3-B2-S4</span> (Aisle A3, Bay B2, Shelf S4)
            </div>
          </div>
        </div>
      </Card>

      {/* Locations Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Loading locations...
                </TableCell>
              </TableRow>
            ) : filteredLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No locations found
                </TableCell>
              </TableRow>
            ) : (
              filteredLocations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="font-mono font-semibold">{inv.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{inv.sku.code}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{inv.sku.product.name}</div>
                      {inv.sku.product.brand && (
                        <div className="text-sm text-gray-600">{inv.sku.product.brand}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{inv.onHand}</TableCell>
                  <TableCell className="text-right text-gray-600">{inv.allocated}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={inv.onHand - inv.allocated > 0 ? 'default' : 'secondary'}>
                      {inv.onHand - inv.allocated}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingLocation(inv);
                            setNewLocation(inv.location);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Location</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Product</label>
                            <div className="text-sm text-gray-600">{inv.sku.product.name}</div>
                            <div className="text-xs text-gray-500">SKU: {inv.sku.code}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">New Location</label>
                            <Input
                              value={newLocation}
                              onChange={(e) => setNewLocation(e.target.value.toUpperCase())}
                              placeholder="A3-B2-S4"
                              className="font-mono"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Format: Aisle-Bay-Shelf (e.g., A3-B2-S4)
                            </div>
                          </div>
                          <Button
                            onClick={() => handleUpdateLocation(inv.sku.id, newLocation)}
                            className="w-full"
                          >
                            Update Location
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
