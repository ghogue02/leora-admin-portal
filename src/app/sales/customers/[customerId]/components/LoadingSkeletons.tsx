export function CustomerHeaderSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200"></div>
        </div>
        <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200"></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200"></div>
            <div className="mt-1 h-4 w-24 animate-pulse rounded bg-gray-200"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
          <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-200"></div>
          <div className="mt-1 h-3 w-16 animate-pulse rounded bg-gray-200"></div>
        </div>
      ))}
    </div>
  );
}

export function OrderHistorySkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-32 animate-pulse rounded bg-gray-200"></div>
      <div className="mt-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-gray-100 pb-4"
          >
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
              <div className="mt-1 h-3 w-24 animate-pulse rounded bg-gray-200"></div>
            </div>
            <div className="h-6 w-20 animate-pulse rounded bg-gray-200"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityTimelineSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200"></div>
      <div className="mt-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200"></div>
            <div className="flex-1">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200"></div>
              <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-200"></div>
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopProductsSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200"></div>
      <div className="mt-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200"></div>
              <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-200"></div>
            </div>
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductRecommendationsSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-100 p-4">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200"></div>
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-200"></div>
            <div className="mt-3 flex items-center justify-between">
              <div className="h-3 w-16 animate-pulse rounded bg-gray-200"></div>
              <div className="h-6 w-6 rounded-full border border-gray-200"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
