'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Phone, Edit, Check } from 'lucide-react';

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onAction: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  className = ''
}) => {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const maxSwipe = 80;
  const threshold = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = offset;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const deltaX = e.touches[0].clientX - startX.current;
    const newOffset = currentX.current + deltaX;

    // Limit swipe range
    if (newOffset > maxSwipe) {
      setOffset(maxSwipe);
    } else if (newOffset < -maxSwipe) {
      setOffset(-maxSwipe);
    } else {
      setOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Snap to position based on threshold
    if (offset > threshold) {
      setOffset(maxSwipe);
    } else if (offset < -threshold) {
      setOffset(-maxSwipe);
    } else {
      setOffset(0);
    }
  };

  const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => {
    if (!actions.length || (side === 'left' && offset <= 0) || (side === 'right' && offset >= 0)) {
      return null;
    }

    return (
      <div
        className={`absolute top-0 bottom-0 flex items-center ${
          side === 'left' ? 'left-0' : 'right-0'
        }`}
      >
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onAction();
              setOffset(0);
            }}
            className={`flex flex-col items-center justify-center w-20 h-full ${action.bgColor} ${action.color} active:opacity-80 transition-opacity`}
            aria-label={action.label}
          >
            {action.icon}
            <span className="text-xs mt-1">{action.label}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`relative overflow-hidden ${className}`} ref={cardRef}>
      {renderActions(leftActions, 'left')}
      {renderActions(rightActions, 'right')}

      <div
        className={`relative bg-white transition-transform ${
          isDragging ? 'duration-0' : 'duration-300'
        }`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

// Predefined action configurations
export const swipeActions = {
  delete: (onDelete: () => void): SwipeAction => ({
    icon: <Trash2 className="w-5 h-5" />,
    label: 'Delete',
    color: 'text-white',
    bgColor: 'bg-red-600',
    onAction: onDelete
  }),
  call: (onCall: () => void): SwipeAction => ({
    icon: <Phone className="w-5 h-5" />,
    label: 'Call',
    color: 'text-white',
    bgColor: 'bg-green-600',
    onAction: onCall
  }),
  edit: (onEdit: () => void): SwipeAction => ({
    icon: <Edit className="w-5 h-5" />,
    label: 'Edit',
    color: 'text-white',
    bgColor: 'bg-blue-600',
    onAction: onEdit
  }),
  complete: (onComplete: () => void): SwipeAction => ({
    icon: <Check className="w-5 h-5" />,
    label: 'Done',
    color: 'text-white',
    bgColor: 'bg-green-600',
    onAction: onComplete
  })
};
