'use client';

import { useState } from 'react';

type TastingNotes = {
  aroma?: string;
  palate?: string;
  finish?: string;
  foodPairings?: string[];
  sommelierNotes?: string;
};

type TastingNotesCardProps = {
  tastingNotes: TastingNotes;
  compact?: boolean;
};

export function TastingNotesCard({ tastingNotes, compact = false }: TastingNotesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasNotes = tastingNotes.aroma || tastingNotes.palate || tastingNotes.finish;

  if (!hasNotes) return null;

  if (compact) {
    return (
      <div className="mt-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-left transition hover:border-purple-300 hover:bg-purple-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🍷</span>
              <span className="text-xs font-semibold text-purple-900">Tasting Notes</span>
            </div>
            <svg
              className={`h-4 w-4 text-purple-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {!isExpanded && tastingNotes.aroma && (
            <p className="mt-1 line-clamp-1 text-xs italic text-purple-800">
              {tastingNotes.aroma}
            </p>
          )}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-3 rounded-lg border border-purple-200 bg-white p-3">
            {tastingNotes.aroma && (
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-sm">🌸</span>
                  <h4 className="text-xs font-semibold text-purple-900">Aroma</h4>
                </div>
                <p className="text-xs leading-relaxed text-gray-700">{tastingNotes.aroma}</p>
              </div>
            )}

            {tastingNotes.palate && (
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-sm">👅</span>
                  <h4 className="text-xs font-semibold text-red-900">Palate</h4>
                </div>
                <p className="text-xs leading-relaxed text-gray-700">{tastingNotes.palate}</p>
              </div>
            )}

            {tastingNotes.finish && (
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-sm">✨</span>
                  <h4 className="text-xs font-semibold text-amber-900">Finish</h4>
                </div>
                <p className="text-xs leading-relaxed text-gray-700">{tastingNotes.finish}</p>
              </div>
            )}

            {tastingNotes.foodPairings && tastingNotes.foodPairings.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="text-sm">🍽️</span>
                  <h4 className="text-xs font-semibold text-green-900">Food Pairings</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tastingNotes.foodPairings.map((pairing, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                    >
                      {pairing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tastingNotes.sommelierNotes && (
              <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-sm">💎</span>
                  <h4 className="text-xs font-semibold text-indigo-900">Sommelier Notes</h4>
                </div>
                <p className="text-xs italic leading-relaxed text-indigo-800">
                  {tastingNotes.sommelierNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full expanded view (for modal)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {tastingNotes.aroma && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">🌸</span>
              <h4 className="font-semibold text-purple-900">Aroma</h4>
            </div>
            <p className="text-sm leading-relaxed text-purple-800">{tastingNotes.aroma}</p>
          </div>
        )}

        {tastingNotes.palate && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">👅</span>
              <h4 className="font-semibold text-red-900">Palate</h4>
            </div>
            <p className="text-sm leading-relaxed text-red-800">{tastingNotes.palate}</p>
          </div>
        )}

        {tastingNotes.finish && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h4 className="font-semibold text-amber-900">Finish</h4>
            </div>
            <p className="text-sm leading-relaxed text-amber-800">{tastingNotes.finish}</p>
          </div>
        )}
      </div>

      {tastingNotes.foodPairings && tastingNotes.foodPairings.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🍽️</span>
            <h4 className="text-sm font-semibold text-gray-900">Food Pairings</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {tastingNotes.foodPairings.map((pairing, idx) => (
              <span
                key={idx}
                className="rounded-full border border-green-200 bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
              >
                {pairing}
              </span>
            ))}
          </div>
        </div>
      )}

      {tastingNotes.sommelierNotes && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💎</span>
            <h4 className="font-semibold text-indigo-900">Sommelier Notes</h4>
          </div>
          <p className="text-sm italic leading-relaxed text-indigo-800">
            {tastingNotes.sommelierNotes}
          </p>
        </div>
      )}
    </div>
  );
}
