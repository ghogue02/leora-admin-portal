export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 h-6 w-48 rounded bg-gray-200"></div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-gray-100"></div>
        <div className="h-4 w-3/4 rounded bg-gray-100"></div>
        <div className="h-4 w-5/6 rounded bg-gray-100"></div>
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex gap-4">
          <div className="h-4 w-32 rounded bg-gray-200"></div>
          <div className="h-4 w-24 rounded bg-gray-200"></div>
          <div className="h-4 w-28 rounded bg-gray-200"></div>
          <div className="h-4 w-20 rounded bg-gray-200"></div>
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex gap-4">
              <div className="h-4 w-32 rounded bg-gray-100"></div>
              <div className="h-4 w-24 rounded bg-gray-100"></div>
              <div className="h-4 w-28 rounded bg-gray-100"></div>
              <div className="h-4 w-20 rounded bg-gray-100"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetric() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-2 h-4 w-24 rounded bg-gray-200"></div>
      <div className="h-8 w-32 rounded bg-gray-100"></div>
      <div className="mt-2 h-3 w-16 rounded bg-gray-100"></div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 h-5 w-48 rounded bg-gray-200"></div>
          <div className="h-4 w-full rounded bg-gray-100"></div>
          <div className="mt-2 h-4 w-3/4 rounded bg-gray-100"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="mb-2 h-4 w-32 rounded bg-gray-200"></div>
        <div className="h-8 w-64 rounded bg-gray-100"></div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
