'use client';

import React, { useState } from 'react';
import { MobileHeader, MobileHeaderAction } from '@/components/mobile/MobileHeader';
import { MobileNav } from '@/components/mobile/MobileNav';
import { TouchOptimizedButton, BottomSheet, TouchOptimizedCard } from '@/components/mobile/TouchOptimized';
import { Calendar, Clock, MapPin, Users, Plus, ChevronLeft, ChevronRight, Video } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'call' | 'meeting' | 'demo' | 'follow-up';
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  isVirtual?: boolean;
  color: string;
}

export default function MobileCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Mock events
  const events: CalendarEvent[] = [
    {
      id: '1',
      title: 'Sales Call - Acme Corp',
      type: 'call',
      startTime: '09:00',
      endTime: '09:30',
      attendees: ['John Smith'],
      color: 'bg-blue-500'
    },
    {
      id: '2',
      title: 'Product Demo',
      type: 'demo',
      startTime: '10:30',
      endTime: '11:30',
      location: 'Conference Room A',
      attendees: ['Sarah Johnson', 'Mike Williams'],
      color: 'bg-purple-500'
    },
    {
      id: '3',
      title: 'Team Standup',
      type: 'meeting',
      startTime: '13:00',
      endTime: '13:30',
      isVirtual: true,
      attendees: ['Team'],
      color: 'bg-green-500'
    },
    {
      id: '4',
      title: 'Client Follow-up',
      type: 'follow-up',
      startTime: '15:00',
      endTime: '15:30',
      attendees: ['Alex Turner'],
      color: 'bg-orange-500'
    }
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Clock className="w-4 h-4" />;
      case 'meeting':
        return <Users className="w-4 h-4" />;
      case 'demo':
        return <Video className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader
        title="Calendar"
        actions={
          <MobileHeaderAction
            icon={<Plus className="w-6 h-6" />}
            onClick={() => console.log('Add event')}
          />
        }
      />

      {/* Date Navigator */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousDay}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] text-blue-600 active:opacity-70"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {formatDate(selectedDate)}
            </h2>
          </div>

          <button
            onClick={goToNextDay}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] text-blue-600 active:opacity-70"
            aria-label="Next day"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <TouchOptimizedButton
            variant={viewMode === 'day' ? 'primary' : 'secondary'}
            size="small"
            fullWidth
            onClick={() => setViewMode('day')}
          >
            Day
          </TouchOptimizedButton>
          <TouchOptimizedButton
            variant={viewMode === 'week' ? 'primary' : 'secondary'}
            size="small"
            fullWidth
            onClick={() => setViewMode('week')}
          >
            Week
          </TouchOptimizedButton>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="p-4 space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No events scheduled</p>
            <TouchOptimizedButton
              variant="primary"
              size="medium"
              onClick={() => console.log('Add event')}
              className="mt-4"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Event
            </TouchOptimizedButton>
          </div>
        ) : (
          events.map(event => (
            <TouchOptimizedCard
              key={event.id}
              onClick={() => handleEventClick(event)}
            >
              <div className="flex gap-3">
                {/* Time Bar */}
                <div className={`w-1 rounded-full ${event.color}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {event.title}
                      </h3>
                      <div className="flex items-center mt-1 text-sm text-gray-600">
                        {getEventIcon(event.type)}
                        <span className="ml-1">
                          {event.startTime} - {event.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {event.isVirtual && (
                      <div className="flex items-center text-sm text-blue-600">
                        <Video className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>Virtual Meeting</span>
                      </div>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">
                          {event.attendees.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TouchOptimizedCard>
          ))
        )}
      </div>

      {/* Event Details Bottom Sheet */}
      <BottomSheet
        isOpen={showEventDetails}
        onClose={() => setShowEventDetails(false)}
        title={selectedEvent?.title || 'Event Details'}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center text-gray-700">
              <Clock className="w-5 h-5 mr-3" />
              <span>
                {selectedEvent.startTime} - {selectedEvent.endTime}
              </span>
            </div>

            {selectedEvent.location && (
              <div className="flex items-center text-gray-700">
                <MapPin className="w-5 h-5 mr-3" />
                <span>{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent.isVirtual && (
              <div className="flex items-center text-blue-600">
                <Video className="w-5 h-5 mr-3" />
                <span>Virtual Meeting</span>
              </div>
            )}

            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <div className="flex items-center text-gray-700 mb-2">
                  <Users className="w-5 h-5 mr-3" />
                  <span className="font-medium">Attendees</span>
                </div>
                <div className="ml-8 space-y-1">
                  {selectedEvent.attendees.map((attendee, index) => (
                    <div key={index} className="text-gray-600">
                      {attendee}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 space-y-2">
              <TouchOptimizedButton variant="primary" size="medium" fullWidth>
                Join Meeting
              </TouchOptimizedButton>
              <TouchOptimizedButton variant="outline" size="medium" fullWidth>
                Edit Event
              </TouchOptimizedButton>
            </div>
          </div>
        )}
      </BottomSheet>

      <MobileNav />
    </div>
  );
}
