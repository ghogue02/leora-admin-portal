import OrdersList from "./sections/OrdersList";
import Link from "next/link";
import { PlusCircle, ShoppingCart } from "lucide-react";

export default function OrdersPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Orders</p>
          <h1 className="text-3xl font-semibold text-gray-900">All orders in one place.</h1>
          <p className="max-w-2xl text-sm text-gray-600">
            Monitor open exposure, track invoice totals, and download detail straight from Supabase.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/sales/catalog"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            Browse Catalog
          </Link>
          <Link
            href="/admin/orders/new"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Create Order
          </Link>
        </div>
      </header>

      <OrdersList />
    </main>
  );
}
