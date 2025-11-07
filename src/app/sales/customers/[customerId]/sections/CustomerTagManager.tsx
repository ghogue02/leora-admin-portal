'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import {
  CUSTOMER_TAG_META,
  CUSTOMER_TAG_TYPES,
  CustomerTagType,
  getCustomerTagLabel,
} from '@/constants/customerTags';

type CustomerTag = {
  id: string;
  tagType: CustomerTagType;
  tagValue: string | null;
  addedAt: string;
};

type CustomerTagManagerProps = {
  customerId: string;
};

export default function CustomerTagManager({ customerId }: CustomerTagManagerProps) {
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadTags();
  }, [customerId]);

  const loadTags = async () => {
    try {
      const response = await fetch(`/api/sales/customers/${customerId}/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showDropdown) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [showDropdown]);

  const handleAddTag = async (tagType: CustomerTagType) => {
    setAdding(true);
    setShowDropdown(false);
    try {
      const response = await fetch(`/api/sales/customers/${customerId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagType }),
      });
      if (response.ok) {
        await loadTags();
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setRemovingId(tagId);
    try {
      const response = await fetch(`/api/sales/customers/${customerId}/tags/${tagId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadTags();
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const existingTagTypes = new Set(tags.map((tag) => tag.tagType));
  const availableTagTypes = CUSTOMER_TAG_TYPES.filter((type) => !existingTagTypes.has(type));

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Customer Tags</h2>
        </div>

        {availableTagTypes.length > 0 && (
          <div
            className="relative"
            ref={dropdownRef}
          >
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={adding}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {adding ? 'Adding...' : 'Add Tag'}
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-10">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Select Tag Type
                </div>
                <div className="border-t border-gray-100" />
                {availableTagTypes.map((tagType) => (
                  <button
                    key={tagType}
                    type="button"
                    onClick={() => handleAddTag(tagType)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span
                      className={`h-3 w-3 rounded-full ${CUSTOMER_TAG_META[tagType].dotClass}`}
                      aria-hidden="true"
                    />
                    {CUSTOMER_TAG_META[tagType].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {tags.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <Tag className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm text-slate-600">No tags assigned yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Add tags to categorize customers by segment or preference
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${CUSTOMER_TAG_META[tag.tagType].pillClass}`}
            >
              {CUSTOMER_TAG_META[tag.tagType].label}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                disabled={removingId === tag.id}
                className="rounded-full p-0.5 transition-colors hover:bg-black/10 disabled:opacity-50"
                aria-label={`Remove ${getCustomerTagLabel(tag.tagType)} tag`}
              >
                {removingId === tag.id ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
