import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, Loader2 } from "lucide-react";

type SearchResult = {
  id: string;
  label: string;
  subLabel: string;
  link: string;
  highlights?: string[];
  score?: number;
};

type SearchResponse = {
  query: string;
  results: Record<string, SearchResult[]>;
  meta: {
    executionMs: number;
    entitiesRequested: string[];
  };
};

type SearchBarProps = {
  anchorRef?: HTMLDivElement | null;
  open?: boolean;
  onToggle?: (open: boolean) => void;
};

const DEFAULT_ENTITIES = ["products", "customers", "orders"] as const;

export function SearchBar({ anchorRef, open, onToggle }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open ?? internalOpen;

  const visibleResults = useMemo(() => {
    if (!results) return [];
    return DEFAULT_ENTITIES.flatMap((entity) => results.results[entity] ?? []).slice(0, 10);
  }, [results]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setInternalOpen(false);
        onToggle?.(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onToggle]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setError(null);
      setHighlightIndex(0);
      abortRef.current?.abort();
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: "5",
      });
      fetch(`/api/search?${params}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error ?? "Search failed");
          }
          return response.json() as Promise<SearchResponse>;
        })
        .then((payload) => {
          setResults(payload);
          setHighlightIndex(0);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Search failed");
          setLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  const handleNavigate = useCallback(
    (result: SearchResult) => {
      router.push(result.link);
      setInternalOpen(false);
      onToggle?.(false);
    },
    [router, onToggle],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!visibleResults.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, visibleResults.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const result = visibleResults[highlightIndex];
        if (result) handleNavigate(result);
      }
    },
    [visibleResults, highlightIndex, handleNavigate],
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="flex w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-200">
        <SearchIcon className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setInternalOpen(true);
            onToggle?.(true);
          }}
          onFocus={() => {
            setInternalOpen(true);
            onToggle?.(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search products, customers, orders..."
          className="w-full border-none bg-transparent text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none"
          type="search"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </label>

      {isOpen && (visibleResults.length > 0 || error) && (
        <div
          className="absolute z-50 mt-2 w-full max-w-xl rounded-lg border border-slate-200 bg-white shadow-xl"
          style={
            anchorRef
              ? {
                  width: `${anchorRef.clientWidth}px`,
                }
              : undefined
          }
        >
          {error && (
            <div className="p-4 text-sm text-red-600">
              {error}
            </div>
          )}
          {!error && visibleResults.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No matches found.</div>
          )}
          {!error && visibleResults.length > 0 && (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {visibleResults.map((result, index) => (
                <li key={`${result.id}-${result.link}`}>
                  <button
                    type="button"
                    onClick={() => handleNavigate(result)}
                    className={`w-full px-4 py-3 text-left text-sm transition ${
                      highlightIndex === index
                        ? "bg-slate-50 text-gray-900"
                        : "text-gray-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-medium">{result.label}</div>
                    {result.subLabel && (
                      <div className="text-xs text-gray-500">{result.subLabel}</div>
                    )}
                    {result.highlights && result.highlights.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        {result.highlights.map((highlight) => (
                          <span
                            key={highlight}
                            className="rounded-full border border-slate-200 px-2 py-0.5"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {results && (
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
              Search in {results.meta.executionMs}ms · {results.meta.entitiesRequested.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
