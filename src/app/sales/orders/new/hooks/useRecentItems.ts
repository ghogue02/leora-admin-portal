'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RecentPurchaseSuggestion } from '@/types/orders';

type UseRecentItemsResult = {
  items: RecentPurchaseSuggestion[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useRecentItems(customerId: string | null): UseRecentItemsResult {
  const [items, setItems] = useState<RecentPurchaseSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const reload = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!customerId) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadRecentItems() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sales/customers/${customerId}/recent-items`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? 'Unable to load recent purchases.');
        }
        const data = (await response.json()) as { items: RecentPurchaseSuggestion[] };
        if (!cancelled) {
          setItems(data.items ?? []);
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setItems([]);
        setError(err instanceof Error ? err.message : 'Unable to load recent purchases.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecentItems();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [customerId, refreshToken]);

  return { items, loading, error, reload };
}
