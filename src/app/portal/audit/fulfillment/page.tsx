import Link from "next/link";
import { headers } from "next/headers";

async function fetchAuditData() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) {
    throw new Error("Unable to resolve host for audit fetch.");
  }
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const cookie = headerStore.get("cookie") ?? undefined;

  const response = await fetch(`${baseUrl}/api/portal/orders/audit`, {
    cache: "no-store",
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
  });

  if (!response.ok) {
    throw new Error("Unable to load fulfillment audit data.");
  }

  return (await response.json()) as {
    orders: Array<{
      id: string;
      status: string;
      orderedAt: string | null;
      lines: Array<{
        id: string;
        skuId: string;
        quantity: number;
        pricing: unknown;
      }>;
    }>;
  };
}

export default async function FulfillmentAuditPage() {
  const data = await fetchAuditData();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Operations</p>
        <h1 className="text-3xl font-semibold text-gray-900">Fulfillment audit trail</h1>
        <p className="text-sm text-gray-600">
          Inspect pricing waterfalls and inventory allocations captured during checkout.
        </p>
        <Link
          href="/portal/orders"
          className="inline-flex w-fit items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
        >
          Back to orders
        </Link>
      </header>

      <section className="space-y-4">
        {data.orders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders available for auditing yet.</p>
        ) : (
          data.orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <p className="font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                  <p>Status: {order.status}</p>
                </div>
                <p>Ordered {order.orderedAt ? new Date(order.orderedAt).toLocaleString() : "—"}</p>
              </div>
              <div className="mt-4 space-y-3 text-xs text-gray-600">
                {order.lines.map((line) => (
                  <div key={line.id} className="rounded border border-slate-200 px-3 py-2">
                    <p className="font-semibold text-gray-900">SKU {line.skuId}</p>
                    <p>Quantity: {line.quantity}</p>
                    <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-[11px] text-gray-700">
                      {JSON.stringify(line.pricing, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
