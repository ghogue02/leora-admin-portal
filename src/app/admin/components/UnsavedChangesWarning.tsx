'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesWarningProps {
  hasUnsavedChanges: boolean;
  onSave?: () => void;
}

export function UnsavedChangesWarning({
  hasUnsavedChanges,
  onSave,
}: UnsavedChangesWarningProps) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!hasUnsavedChanges) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800">
              You have unsaved changes
            </p>
          </div>
          {onSave && (
            <button
              onClick={onSave}
              className="px-4 py-1.5 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to track form changes
export function useUnsavedChanges<T extends Record<string, any>>(
  initialData: T,
  currentData: T
): boolean {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed = JSON.stringify(initialData) !== JSON.stringify(currentData);
    setHasChanges(changed);
  }, [initialData, currentData]);

  return hasChanges;
}
