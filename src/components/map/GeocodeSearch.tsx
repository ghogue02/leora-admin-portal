'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useMap } from 'react-map-gl';

interface GeocodeResult {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
  text: string;
}

interface GeocodeSearchProps {
  /** Callback when a location is selected */
  onSelect?: (result: GeocodeResult) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Access token for Mapbox Geocoding API */
  accessToken?: string;
  /** Add marker at selected location */
  addMarker?: boolean;
  /** Fly to location on select */
  flyTo?: boolean;
  /** Custom className */
  className?: string;
}

export default function GeocodeSearch({
  onSelect,
  placeholder = 'Search for address, city, or place...',
  accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  addMarker = true,
  flyTo = true,
  className = '',
}: GeocodeSearchProps) {
  const { current: map } = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<GeocodeResult[]>([]);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mapbox-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Geocode search
  const geocode = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !accessToken) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            searchQuery
          )}.json?access_token=${accessToken}&limit=5&autocomplete=true`
        );
        const data = await response.json();
        setResults(data.features || []);
        setShowResults(true);
      } catch (error) {
        console.error('Geocoding error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  // Debounced search
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        geocode(value);
      }, 300);
    },
    [geocode]
  );

  // Handle result selection
  const handleSelectResult = useCallback(
    (result: GeocodeResult) => {
      setQuery(result.place_name);
      setShowResults(false);
      setResults([]);

      // Save to recent searches
      const updated = [result, ...recentSearches.filter((r) => r.id !== result.id)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('mapbox-recent-searches', JSON.stringify(updated));

      // Fly to location
      if (map && flyTo) {
        map.flyTo({
          center: result.center,
          zoom: 14,
          duration: 1500,
        });
      }

      // Callback
      onSelect?.(result);
    },
    [map, flyTo, onSelect, recentSearches]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  }, []);

  const displayResults = query.trim() ? results : recentSearches;

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {query && !loading && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && displayResults.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg max-h-80 overflow-y-auto">
          {!query.trim() && recentSearches.length > 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-b">Recent Searches</div>
          )}
          <div className="p-1">
            {displayResults.map((result) => (
              <button
                key={result.id}
                className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm transition-colors"
                onClick={() => handleSelectResult(result)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{result.text}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.place_name}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
