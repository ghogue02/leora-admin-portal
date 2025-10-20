import OrdersList from "./sections/OrdersList";

export default function OrdersPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Orders</p>
        <h1 className="text-3xl font-semibold text-gray-900">All orders in one place.</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Monitor open exposure, track invoice totals, and download detail straight from Supabase.
        </p>
      </header>

      <OrdersList />
    </main>
  );
}
