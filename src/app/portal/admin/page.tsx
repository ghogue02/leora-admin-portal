export default function AdminAutomationPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Admin</p>
        <h1 className="text-3xl font-semibold text-gray-900">Administration</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Administrative settings and system management.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          Admin features are available here. Additional functionality coming soon.
        </p>
      </section>
    </main>
  );
}
