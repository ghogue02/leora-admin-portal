export default function Loading() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <span className="text-gray-400">/</span>
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <span className="text-gray-400">/</span>
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      </div>

      {/* Header skeleton */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 space-y-3">
            <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-24 w-64 animate-pulse rounded bg-slate-100" />
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      </div>

      {/* Ordering pace skeleton */}
      <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white" />

      {/* Quick actions skeleton */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      </div>

      {/* Additional sections skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white"
        />
      ))}
    </main>
  );
}
