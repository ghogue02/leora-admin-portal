'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcut } from './KeyboardShortcuts';

interface SearchResult {
  id: string;
  type: 'customer' | 'order' | 'user' | 'product';
  title: string;
  subtitle?: string;
  url: string;
}

interface SearchResultsGroup {
  type: string;
  label: string;
  results: SearchResult[];
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultsGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useKeyboardShortcut('search', () => {
    setIsOpen(true);
  }, []);

  useKeyboardShortcut('escape', () => {
    if (isOpen) {
      setIsOpen(false);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/admin/search?q=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalResults = results.reduce((acc, group) => acc + group.results.length, 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalResults);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalResults) % totalResults);
    } else if (e.key === 'Enter' && totalResults > 0) {
      e.preventDefault();
      let currentIndex = 0;
      for (const group of results) {
        for (const result of group.results) {
          if (currentIndex === selectedIndex) {
            handleResultClick(result);
            return;
          }
          currentIndex++;
        }
      }
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search customers, orders, users, products..."
              className="flex-1 outline-none text-gray-900 placeholder-gray-400"
            />
            {isLoading && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Results */}
          {query.trim() && (
            <div className="max-h-96 overflow-y-auto">
              {results.length === 0 && !isLoading && (
                <div className="p-8 text-center text-gray-500">
                  No results found for &ldquo;{query}&rdquo;
                </div>
              )}

              {results.map((group) => (
                <div key={group.type}>
                  <div className="px-4 py-2 bg-gray-50 text-sm font-semibold text-gray-700">
                    {group.label}
                  </div>
                  {group.results.map((result, index) => {
                    let globalIndex = 0;
                    for (const g of results) {
                      if (g.type === group.type) break;
                      globalIndex += g.results.length;
                    }
                    globalIndex += index;

                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          globalIndex === selectedIndex ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-gray-500">
                            {result.subtitle}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>
                <kbd className="px-2 py-1 bg-white border rounded">↑↓</kbd> Navigate
              </span>
              <span>
                <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> Select
              </span>
              <span>
                <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
