import CatalogGrid from "./sections/CatalogGrid";

export default function CatalogPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Catalog</p>
        <h1 className="text-3xl font-semibold text-gray-900">Browse the portfolio.</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Search active SKUs with live inventory and price lists sourced directly from Supabase.
          Add items to your cart for quick ordering.
        </p>
      </header>

      <CatalogGrid />
    </main>
  );
}
