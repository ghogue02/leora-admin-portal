import Link from "next/link";
import OrdersList from "./sections/OrdersList";

export default function OrdersPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex justify-end">
        <Link
          href="/sales/orders/new"
          className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          New Order
        </Link>
      </header>

      <OrdersList />
    </main>
  );
}
