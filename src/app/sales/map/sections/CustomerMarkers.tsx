'use client';

import { useMemo, useState, useEffect } from 'react';
import { Marker, Popup } from 'react-map-gl';
import { MapPin } from 'lucide-react';
import { MapFilters } from '../page';
import MapPopup from '../components/MapPopup';

interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  accountType: 'ACTIVE' | 'TARGET' | 'PROSPECT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  revenue: number;
  lastOrderDate: string | null;
  phone: string;
  territoryId: string | null;
  salesRepId: string | null;
}

interface CustomerMarkersProps {
  filters: MapFilters;
  onMarkerClick: (customerId: string) => void;
  selectedCustomerId: string | null;
}

// Mock customer data - Replace with actual API call
const generateMockCustomers = (): Customer[] => {
  const types: Customer['accountType'][] = ['ACTIVE', 'TARGET', 'PROSPECT'];
  const priorities: Customer['priority'][] = ['HIGH', 'MEDIUM', 'LOW'];
  const customers: Customer[] = [];

  // Generate 100 sample customers for demo (in production, fetch from API)
  for (let i = 0; i < 100; i++) {
    customers.push({
      id: `customer-${i}`,
      name: `Customer ${i + 1}`,
      address: `${Math.floor(Math.random() * 9999)} Main St`,
      city: 'Sample City',
      state: 'CA',
      zip: '90001',
      latitude: 37.0902 + (Math.random() - 0.5) * 10,
      longitude: -95.7129 + (Math.random() - 0.5) * 20,
      accountType: types[Math.floor(Math.random() * types.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      revenue: Math.random() * 100000,
      lastOrderDate: Math.random() > 0.3 ? new Date().toISOString() : null,
      phone: '555-0100',
      territoryId: Math.random() > 0.5 ? `territory-${Math.floor(Math.random() * 5)}` : null,
      salesRepId: Math.random() > 0.5 ? `rep-${Math.floor(Math.random() * 10)}` : null,
    });
  }

  return customers;
};

const getMarkerColor = (accountType: Customer['accountType']): string => {
  switch (accountType) {
    case 'ACTIVE':
      return '#22c55e'; // Green
    case 'TARGET':
      return '#eab308'; // Yellow
    case 'PROSPECT':
      return '#94a3b8'; // Gray
    default:
      return '#64748b';
  }
};

const getMarkerSize = (revenue: number): number => {
  if (revenue > 50000) return 32; // Large
  if (revenue > 20000) return 24; // Medium
  return 16; // Small
};

export default function CustomerMarkers({
  filters,
  onMarkerClick,
  selectedCustomerId
}: CustomerMarkersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch customers with real API
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        // Get tenantId from context or environment
        const tenantId = localStorage.getItem('tenantId') || process.env.NEXT_PUBLIC_TENANT_ID;

        if (!tenantId) {
          console.error('Tenant ID not found');
          const data = generateMockCustomers();
          setCustomers(data);
          setLoading(false);
          return;
        }

        // Build query params
        const params = new URLSearchParams({ tenantId });

        if (filters.territories.length > 0) {
          filters.territories.forEach(t => params.append('territories', t));
        }

        if (filters.accountTypes.length > 0) {
          filters.accountTypes.forEach(at => params.append('accountTypes', at));
        }

        if (filters.salesReps.length > 0) {
          filters.salesReps.forEach(sr => params.append('salesReps', sr));
        }

        const response = await fetch(`/api/maps/customers?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch customers');
        }

        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
        // Fallback to mock data
        const data = generateMockCustomers();
        setCustomers(data);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [filters]);

  // Filter customers based on current filters
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Account type filter
      if (!filters.accountTypes.includes(customer.accountType)) {
        return false;
      }

      // Territory filter
      if (filters.territories.length > 0 && customer.territoryId) {
        if (!filters.territories.includes(customer.territoryId)) {
          return false;
        }
      }

      // Sales rep filter
      if (filters.salesReps.length > 0 && customer.salesRepId) {
        if (!filters.salesReps.includes(customer.salesRepId)) {
          return false;
        }
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          customer.name.toLowerCase().includes(query) ||
          customer.address.toLowerCase().includes(query) ||
          customer.city.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [customers, filters]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  if (loading) {
    return null;
  }

  return (
    <>
      {filteredCustomers.map((customer) => {
        const color = getMarkerColor(customer.accountType);
        const size = getMarkerSize(customer.revenue);

        return (
          <Marker
            key={customer.id}
            longitude={customer.longitude}
            latitude={customer.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onMarkerClick(customer.id);
            }}
          >
            <div
              className="cursor-pointer transition-transform hover:scale-110"
              style={{
                width: size,
                height: size,
              }}
            >
              <MapPin
                style={{ color }}
                fill={color}
                className="w-full h-full drop-shadow-lg"
              />
            </div>
          </Marker>
        );
      })}

      {/* Popup for selected customer */}
      {selectedCustomer && (
        <Popup
          longitude={selectedCustomer.longitude}
          latitude={selectedCustomer.latitude}
          anchor="top"
          onClose={() => onMarkerClick('')}
          closeButton={true}
          closeOnClick={false}
        >
          <MapPopup customer={selectedCustomer} />
        </Popup>
      )}
    </>
  );
}
