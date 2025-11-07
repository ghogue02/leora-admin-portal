'use client';

import React, { useEffect, useState } from 'react';
import { Command, X } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
}

interface KeyboardShortcutsProps {
  shortcuts?: Shortcut[];
}

const defaultShortcuts = [
  { key: 'Ctrl+S / Cmd+S', description: 'Save current form', action: () => {} },
  { key: 'Ctrl+K / Cmd+K', description: 'Open search', action: () => {} },
  { key: 'Esc', description: 'Close modals/dialogs', action: () => {} },
  { key: 'Ctrl+/ / Cmd+/', description: 'Show keyboard shortcuts', action: () => {} },
];

export function KeyboardShortcutsHelp({
  shortcuts = defaultShortcuts,
}: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenBefore, setHasSeenBefore] = useState(true);

  // Disabled auto-popup on first visit
  // Users can press Ctrl+/ or click the button to view shortcuts
  // useEffect(() => {
  //   const seen = localStorage.getItem('keyboard-shortcuts-seen');
  //   if (!seen) {
  //     setHasSeenBefore(false);
  //     setTimeout(() => setIsOpen(true), 2000);
  //   }
  // }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (!hasSeenBefore) {
          localStorage.setItem('keyboard-shortcuts-seen', 'true');
          setHasSeenBefore(true);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasSeenBefore]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors z-40"
        title="Keyboard shortcuts (Ctrl+/)"
      >
        <Command className="w-5 h-5" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-full z-50">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Command className="w-6 h-6 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-gray-600">
                  {shortcut.description}
                </span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>

          {!hasSeenBefore && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Press <kbd className="px-2 py-1 text-xs font-semibold bg-white border border-blue-300 rounded">Ctrl+/</kbd> anytime to toggle this help.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// Hook for registering keyboard shortcuts
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Handle Ctrl+S / Cmd+S
      if (key === 'save' && modifierKey && e.key === 's') {
        e.preventDefault();
        callback();
      }
      // Handle Ctrl+K / Cmd+K
      else if (key === 'search' && modifierKey && e.key === 'k') {
        e.preventDefault();
        callback();
      }
      // Handle Escape
      else if (key === 'escape' && e.key === 'Escape') {
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ...deps]);
}
