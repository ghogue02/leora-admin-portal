export default function SalesTerritoryPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Territory</p>
        <h1 className="text-3xl font-semibold text-gray-900">Territory Management</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          View your assigned territory and customer locations.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">Territory map coming soon...</p>
      </div>
    </main>
  );
}
