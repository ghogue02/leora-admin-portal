'use client';

import React, { useState } from 'react';
import { MobileHeader, MobileHeaderAction } from '@/components/mobile/MobileHeader';
import { MobileNav } from '@/components/mobile/MobileNav';
import { SwipeableCard, swipeActions } from '@/components/mobile/SwipeableCard';
import { TouchOptimizedButton, BottomSheet } from '@/components/mobile/TouchOptimized';
import { Phone, MapPin, Clock, Filter, Plus, TrendingUp } from 'lucide-react';

interface CallTask {
  id: string;
  customer: string;
  company: string;
  phone: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'missed';
  scheduledTime: string;
  location: string;
  notes: string;
}

export default function MobileCallPlanPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Mock data
  const callTasks: CallTask[] = [
    {
      id: '1',
      customer: 'John Smith',
      company: 'Acme Corp',
      phone: '+1 (555) 123-4567',
      priority: 'high',
      status: 'pending',
      scheduledTime: '9:00 AM',
      location: '123 Main St, San Francisco',
      notes: 'Follow up on Q4 proposal'
    },
    {
      id: '2',
      customer: 'Sarah Johnson',
      company: 'Tech Solutions',
      phone: '+1 (555) 234-5678',
      priority: 'medium',
      status: 'pending',
      scheduledTime: '10:30 AM',
      location: '456 Market St, San Francisco',
      notes: 'Demo scheduling call'
    },
    {
      id: '3',
      customer: 'Mike Williams',
      company: 'Global Industries',
      phone: '+1 (555) 345-6789',
      priority: 'high',
      status: 'pending',
      scheduledTime: '2:00 PM',
      location: '789 Oak Ave, Oakland',
      notes: 'Contract renewal discussion'
    }
  ];

  const handleCall = (task: CallTask) => {
    window.location.href = `tel:${task.phone}`;
  };

  const handleComplete = (taskId: string) => {
    console.log('Completing task:', taskId);
    // Handle task completion
  };

  const handleDelete = (taskId: string) => {
    console.log('Deleting task:', taskId);
    // Handle task deletion
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader
        title="Today's Calls"
        actions={
          <MobileHeaderAction
            icon={<Filter className="w-6 h-6" />}
            onClick={() => setShowFilters(true)}
          />
        }
      />

      {/* Stats Summary */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">8</div>
            <div className="text-xs text-gray-600">Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">12</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">75%</div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Call List */}
      <div className="p-4 space-y-3">
        {callTasks.map(task => (
          <SwipeableCard
            key={task.id}
            leftActions={[swipeActions.complete(() => handleComplete(task.id))]}
            rightActions={[
              swipeActions.call(() => handleCall(task)),
              swipeActions.delete(() => handleDelete(task.id))
            ]}
          >
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{task.customer}</h3>
                  <p className="text-sm text-gray-600">{task.company}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{task.scheduledTime}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="truncate">{task.location}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{task.phone}</span>
                </div>
              </div>

              {/* Notes */}
              {task.notes && (
                <p className="mt-3 text-sm text-gray-700 line-clamp-2">
                  {task.notes}
                </p>
              )}

              {/* Quick Actions */}
              <div className="mt-4 flex gap-2">
                <TouchOptimizedButton
                  variant="primary"
                  size="small"
                  fullWidth
                  onClick={() => handleCall(task)}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </TouchOptimizedButton>
                <TouchOptimizedButton
                  variant="outline"
                  size="small"
                  onClick={() => console.log('View details')}
                >
                  Details
                </TouchOptimizedButton>
              </div>
            </div>
          </SwipeableCard>
        ))}
      </div>

      {/* Floating Action Button */}
      <button
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:opacity-80 transition-opacity z-40"
        onClick={() => console.log('Add new call')}
        aria-label="Add call"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter Calls"
      >
        <div className="space-y-3">
          {['all', 'high-priority', 'today', 'this-week'].map(filter => (
            <button
              key={filter}
              onClick={() => {
                setSelectedFilter(filter);
                setShowFilters(false);
              }}
              className={`w-full min-h-[48px] px-4 text-left rounded-lg transition-colors ${
                selectedFilter === filter
                  ? 'bg-blue-100 text-blue-900 font-medium'
                  : 'bg-gray-50 text-gray-900'
              }`}
            >
              {filter.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </BottomSheet>

      <MobileNav />
    </div>
  );
}
