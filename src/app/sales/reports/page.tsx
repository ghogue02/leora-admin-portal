export default function SalesReportsPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Reports</p>
        <h1 className="text-3xl font-semibold text-gray-900">Sales Reports</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          View performance metrics and generate sales reports.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">Reporting dashboard coming soon...</p>
      </div>
    </main>
  );
}
