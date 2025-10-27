'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { PlusIcon, XIcon, TagIcon } from 'lucide-react';

export type CustomerTagType =
  | 'WINE_CLUB'
  | 'EVENTS'
  | 'FEMALE_WINEMAKERS'
  | 'ORGANIC'
  | 'NATURAL_WINE'
  | 'BIODYNAMIC';

type CustomerTag = {
  id: string;
  type: CustomerTagType;
  createdAt: Date;
};

type CustomerTagManagerProps = {
  customerId: string;
  tags: CustomerTag[];
  onAddTag?: (tagType: CustomerTagType) => Promise<void>;
  onRemoveTag?: (tagId: string) => Promise<void>;
  isLoading?: boolean;
};

const TAG_LABELS: Record<CustomerTagType, string> = {
  WINE_CLUB: 'Wine Club',
  EVENTS: 'Events',
  FEMALE_WINEMAKERS: 'Female Winemakers',
  ORGANIC: 'Organic',
  NATURAL_WINE: 'Natural Wine',
  BIODYNAMIC: 'Biodynamic',
};

const TAG_COLORS: Record<CustomerTagType, string> = {
  WINE_CLUB: 'bg-purple-100 text-purple-800 border-purple-200',
  EVENTS: 'bg-blue-100 text-blue-800 border-blue-200',
  FEMALE_WINEMAKERS: 'bg-pink-100 text-pink-800 border-pink-200',
  ORGANIC: 'bg-green-100 text-green-800 border-green-200',
  NATURAL_WINE: 'bg-amber-100 text-amber-800 border-amber-200',
  BIODYNAMIC: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function CustomerTagManager({
  customerId,
  tags,
  onAddTag,
  onRemoveTag,
  isLoading = false,
}: CustomerTagManagerProps) {
  const [removingTagId, setRemovingTagId] = useState<string | null>(null);
  const [addingTag, setAddingTag] = useState(false);

  const existingTagTypes = new Set(tags.map((tag) => tag.type));
  const availableTagTypes = Object.keys(TAG_LABELS).filter(
    (type) => !existingTagTypes.has(type as CustomerTagType)
  ) as CustomerTagType[];

  const handleAddTag = async (tagType: CustomerTagType) => {
    if (!onAddTag) return;

    setAddingTag(true);
    try {
      await onAddTag(tagType);
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!onRemoveTag) return;

    setRemovingTagId(tagId);
    try {
      await onRemoveTag(tagId);
    } catch (error) {
      console.error('Failed to remove tag:', error);
    } finally {
      setRemovingTagId(null);
    }
  };

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      aria-label="Customer Tags"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900">Customer Tags</h2>
        </div>

        {availableTagTypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={isLoading || addingTag}
                aria-label="Add tag"
              >
                <PlusIcon className="h-4 w-4" />
                Add Tag
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Select Tag Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableTagTypes.map((tagType) => (
                <DropdownMenuItem
                  key={tagType}
                  onClick={() => handleAddTag(tagType)}
                  className="cursor-pointer"
                >
                  <span
                    className={`mr-2 h-2 w-2 rounded-full ${TAG_COLORS[tagType].split(' ')[0].replace('bg-', 'bg-')}`}
                    aria-hidden="true"
                  />
                  {TAG_LABELS[tagType]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {tags.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <TagIcon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-2 text-sm text-slate-600">
            No tags assigned to this customer yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Add tags to categorize and segment customers for marketing and reporting
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Customer tags">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="group relative"
              role="listitem"
            >
              <Badge
                className={`${TAG_COLORS[tag.type]} gap-1.5 pr-1 text-xs font-medium`}
                variant="outline"
              >
                {TAG_LABELS[tag.type]}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  disabled={removingTagId === tag.id || isLoading}
                  className="ml-1 rounded-full p-0.5 transition-colors hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50"
                  aria-label={`Remove ${TAG_LABELS[tag.type]} tag`}
                >
                  {removingTagId === tag.id ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <XIcon className="h-3 w-3" aria-hidden="true" />
                  )}
                </button>
              </Badge>
            </div>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          Tags are used for filtering, reporting, and marketing segmentation
        </p>
      )}
    </section>
  );
}
