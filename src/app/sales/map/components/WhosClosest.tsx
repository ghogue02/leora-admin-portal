'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Navigation, MapPin, Phone, DollarSign, Clock, Loader2 } from 'lucide-react';
import { formatDistance, formatDrivingTime } from '@/lib/distance';

interface NearbyCustomer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  distance: number;
  drivingTime: number;
  revenue: number;
  accountType: string;
  phone: string;
}

interface WhosClosestProps {
  onCustomerSelect?: (customerIds: string[]) => void;
  onShowOnMap?: (customers: NearbyCustomer[]) => void;
}

export default function WhosClosest({
  onCustomerSelect,
  onShowOnMap,
}: WhosClosestProps) {
  const [location, setLocation] = useState({ latitude: '', longitude: '' });
  const [radius, setRadius] = useState<string>('25');
  const [customers, setCustomers] = useState<NearbyCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please enter manually.');
        setLoading(false);
      }
    );
  };

  const handleSearch = async () => {
    if (!location.latitude || !location.longitude) {
      alert('Please enter or detect your location');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/maps/closest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          radiusMiles: parseInt(radius),
          limit: 50,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to find nearby customers');
      }

      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error finding nearby customers:', error);
      alert('Failed to find nearby customers');
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    const newSelection = new Set(selectedCustomers);
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId);
    } else {
      newSelection.add(customerId);
    }
    setSelectedCustomers(newSelection);
  };

  const handleShowOnMap = () => {
    if (onShowOnMap) {
      const selectedCustomerData = customers.filter(c =>
        selectedCustomers.has(c.id)
      );
      onShowOnMap(selectedCustomerData);
    }
  };

  const handleAddToCallPlan = () => {
    if (onCustomerSelect) {
      onCustomerSelect(Array.from(selectedCustomers));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Who&apos;s Closest?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Input */}
        <div className="space-y-2">
          <Label>Your Location</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGetCurrentLocation}
              disabled={loading}
              className="shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              Use My Location
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="latitude" className="text-xs">
                Latitude
              </Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                placeholder="37.7749"
                value={location.latitude}
                onChange={(e) =>
                  setLocation({ ...location, latitude: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="longitude" className="text-xs">
                Longitude
              </Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                placeholder="-122.4194"
                value={location.longitude}
                onChange={(e) =>
                  setLocation({ ...location, longitude: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Radius Selector */}
        <div className="space-y-2">
          <Label htmlFor="radius">Search Radius</Label>
          <Select value={radius} onValueChange={setRadius}>
            <SelectTrigger id="radius">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 miles</SelectItem>
              <SelectItem value="10">10 miles</SelectItem>
              <SelectItem value="25">25 miles</SelectItem>
              <SelectItem value="50">50 miles</SelectItem>
              <SelectItem value="100">100 miles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <Button onClick={handleSearch} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Find Nearby Customers
            </>
          )}
        </Button>

        {/* Results */}
        {customers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Found {customers.length} customer{customers.length !== 1 ? 's' : ''}
              </p>
              {selectedCustomers.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleShowOnMap}
                  >
                    Show on Map
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddToCallPlan}
                  >
                    Add to Call Plan
                  </Button>
                </div>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCustomers.has(customer.id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleCustomerSelection(customer.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(customer.id)}
                          onChange={() => toggleCustomerSelection(customer.id)}
                          className="rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <h4 className="font-medium">{customer.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        {customer.address}
                        {customer.city && `, ${customer.city}`}
                        {customer.state && `, ${customer.state}`}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatDistance(customer.distance)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDrivingTime(customer.drivingTime)}
                        </span>
                        {customer.revenue > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${(customer.revenue / 1000).toFixed(1)}k
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
