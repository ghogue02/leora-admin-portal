'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Tag } from 'lucide-react';

type CustomerTag = {
  id: string;
  tagType: string;
  tagValue: string | null;
  addedAt: string;
};

type CustomerTagManagerProps = {
  customerId: string;
};

const TAG_LABELS: Record<string, string> = {
  wine_club: 'Wine Club',
  events: 'Events',
  female_winemakers: 'Female Winemakers',
  organic: 'Organic',
  natural_wine: 'Natural Wine',
  biodynamic: 'Biodynamic',
};

const TAG_COLORS: Record<string, string> = {
  wine_club: 'bg-purple-100 text-purple-800 border-purple-300',
  events: 'bg-blue-100 text-blue-800 border-blue-300',
  female_winemakers: 'bg-pink-100 text-pink-800 border-pink-300',
  organic: 'bg-green-100 text-green-800 border-green-300',
  natural_wine: 'bg-amber-100 text-amber-800 border-amber-300',
  biodynamic: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export default function CustomerTagManager({ customerId }: CustomerTagManagerProps) {
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  const handleAddTag = async (tagType: string) => {
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
  const availableTagTypes = Object.keys(TAG_LABELS).filter(
    (type) => !existingTagTypes.has(type)
  );

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
          <div className="relative">
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
                      className={`h-3 w-3 rounded-full ${TAG_COLORS[tagType].split(' ')[0]}`}
                    />
                    {TAG_LABELS[tagType]}
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${TAG_COLORS[tag.tagType]}`}
            >
              {TAG_LABELS[tag.tagType]}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                disabled={removingId === tag.id}
                className="rounded-full p-0.5 transition-colors hover:bg-black/10 disabled:opacity-50"
                aria-label={`Remove ${TAG_LABELS[tag.tagType]} tag`}
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
