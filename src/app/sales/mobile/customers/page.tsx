'use client';

import React, { useState } from 'react';
import { MobileHeader, MobileHeaderAction } from '@/components/mobile/MobileHeader';
import { MobileNav } from '@/components/mobile/MobileNav';
import { SwipeableCard, swipeActions } from '@/components/mobile/SwipeableCard';
import { TouchOptimizedInput, TouchOptimizedButton, BottomSheet } from '@/components/mobile/TouchOptimized';
import { Search, Building, Phone, Mail, TrendingUp, Filter, Star, MapPin } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  status: 'active' | 'prospect' | 'inactive';
  revenue: string;
  lastContact: string;
  isFavorite: boolean;
}

export default function MobileCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock data
  const customers: Customer[] = [
    {
      id: '1',
      name: 'John Smith',
      company: 'Acme Corp',
      email: 'john@acme.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      status: 'active',
      revenue: '$125K',
      lastContact: '2 days ago',
      isFavorite: true
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      company: 'Tech Solutions Inc',
      email: 'sarah@techsolutions.com',
      phone: '+1 (555) 234-5678',
      location: 'New York, NY',
      status: 'prospect',
      revenue: '$0',
      lastContact: '1 week ago',
      isFavorite: false
    },
    {
      id: '3',
      name: 'Mike Williams',
      company: 'Global Industries',
      email: 'mike@global.com',
      phone: '+1 (555) 345-6789',
      location: 'Austin, TX',
      status: 'active',
      revenue: '$250K',
      lastContact: '3 days ago',
      isFavorite: true
    }
  ];

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || customer.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleToggleFavorite = (customerId: string) => {
    console.log('Toggle favorite:', customerId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'prospect':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader
        title="Customers"
        actions={
          <MobileHeaderAction
            icon={<Filter className="w-6 h-6" />}
            onClick={() => setShowFilters(true)}
          />
        }
      />

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <TouchOptimizedInput
            type="search"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">24</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">18</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">6</div>
            <div className="text-xs text-gray-600">Prospects</div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="p-4 space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No customers found</p>
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <SwipeableCard
              key={customer.id}
              leftActions={[
                {
                  icon: customer.isFavorite ?
                    <Star className="w-5 h-5 fill-white" /> :
                    <Star className="w-5 h-5" />,
                  label: 'Favorite',
                  color: 'text-white',
                  bgColor: 'bg-yellow-500',
                  onAction: () => handleToggleFavorite(customer.id)
                }
              ]}
              rightActions={[
                swipeActions.call(() => handleCall(customer.phone)),
                {
                  icon: <Mail className="w-5 h-5" />,
                  label: 'Email',
                  color: 'text-white',
                  bgColor: 'bg-blue-600',
                  onAction: () => handleEmail(customer.email)
                }
              ]}
            >
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {customer.isFavorite && (
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {customer.name}
                      </h3>
                      <div className="flex items-center mt-1 text-sm text-gray-600">
                        <Building className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{customer.company}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ml-2 ${getStatusColor(customer.status)}`}>
                    {customer.status.toUpperCase()}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{customer.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                    <span className="font-semibold text-gray-900">{customer.revenue}</span>
                    <span className="text-gray-600 ml-1">revenue</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Last contact: {customer.lastContact}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex gap-2">
                  <TouchOptimizedButton
                    variant="primary"
                    size="small"
                    fullWidth
                    onClick={() => handleCall(customer.phone)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </TouchOptimizedButton>
                  <TouchOptimizedButton
                    variant="outline"
                    size="small"
                    fullWidth
                    onClick={() => handleEmail(customer.email)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </TouchOptimizedButton>
                </div>
              </div>
            </SwipeableCard>
          ))
        )}
      </div>

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Customers"
      >
        <div className="space-y-3">
          {['all', 'active', 'prospect', 'inactive'].map(status => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatus(status);
                setShowFilters(false);
              }}
              className={`w-full min-h-[48px] px-4 text-left rounded-lg transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-100 text-blue-900 font-medium'
                  : 'bg-gray-50 text-gray-900'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </BottomSheet>

      <MobileNav />
    </div>
  );
}
