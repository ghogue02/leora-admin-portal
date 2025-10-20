import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <p className="text-6xl font-bold text-gray-300">404</p>
          <h1 className="mt-4 text-3xl font-semibold text-gray-900">
            Customer Not Found
          </h1>
          <p className="mt-2 text-gray-600">
            The customer you are looking for does not exist or you do not have
            access to view it.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/sales/customers"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              View All Customers
            </Link>
            <Link
              href="/sales/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-slate-50"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
