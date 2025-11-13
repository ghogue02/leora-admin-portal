import Link from "next/link";
import OrdersList from "./sections/OrdersList";

export default function OrdersPage() {
  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review, filter, and manage customer orders from a single responsive workspace.
          </p>
        </div>
        <Link
          href="/sales/orders/new"
          className="touch-target inline-flex items-center justify-center rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          New Order
        </Link>
      </header>

      <OrdersList />
    </main>
  );
}
