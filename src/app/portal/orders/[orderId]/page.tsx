import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CancelOrderButton from "./CancelOrderButton";

type OrderDetailResponse = {
  order: {
    id: string;
    status: string;
    orderedAt: string | null;
    fulfilledAt: string | null;
    currency: string;
    total: number | null;
    customer: {
      id: string;
      name: string;
    } | null;
    lines: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      isSample: boolean;
      pricing: {
        source: string;
        priceListName: string | null;
        minQuantity: number | null;
        maxQuantity: number | null;
        allocations: Array<{
          inventoryId: string;
          location: string;
          quantity: number;
        }>;
      } | null;
      sku: {
        id: string;
        code: string;
        size: string | null;
        unitOfMeasure: string | null;
        product: {
          id: string;
          name: string;
          brand: string | null;
          category: string | null;
        };
      };
    }>;
    invoices: Array<{
      id: string;
      invoiceNumber: string | null;
      status: string;
      total: number;
      issuedAt: string | null;
      dueDate: string | null;
      balanceDue: number;
    }>;
  };
};

async function fetchOrder(orderId: string): Promise<OrderDetailResponse["order"]> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) {
    throw new Error("Unable to resolve host for order fetch.");
  }
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const cookie = headerStore.get("cookie") ?? undefined;

  const response = await fetch(`${baseUrl}/api/portal/orders/${orderId}`, {
    cache: "no-store",
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Unable to load order details.");
  }

  const payload = (await response.json()) as OrderDetailResponse;
  return payload.order;
}

type OrderPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  const order = await fetchOrder(orderId);
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency ?? "USD",
    maximumFractionDigits: 2,
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Order</p>
        <h1 className="text-3xl font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
        <p className="text-sm text-gray-600">
          Status: <span className="font-semibold text-gray-900">{order.status}</span>
        </p>
        <div className="text-xs text-gray-500">
          <p>Ordered {order.orderedAt ? new Date(order.orderedAt).toLocaleString() : "—"}</p>
          <p>Fulfilled {order.fulfilledAt ? new Date(order.fulfilledAt).toLocaleString() : "—"}</p>
        </div>
        {order.customer ? (
          <p className="text-sm text-gray-600">
            Customer: <span className="font-semibold text-gray-900">{order.customer.name}</span>
          </p>
        ) : null}
        <div className="flex gap-3">
          <Link
            href="/portal/orders"
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
          >
            Back to orders
          </Link>
          <Link
            href="/portal/invoices"
            className="inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-semibold text-gray-700 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
          >
            View invoices
          </Link>
        </div>
        <CancelOrderButton orderId={order.id} status={order.status} />
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Line items</h2>
            <p className="text-xs text-gray-500">Live pricing and allocated quantities.</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {currencyFormatter.format(order.total ?? 0)}
          </p>
        </header>

        <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-gray-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Quantity</th>
                <th className="px-4 py-3 text-left">Unit price</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">
                  <span className="sr-only">Tags</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{line.sku.product.name}</p>
                    <p className="text-xs text-gray-500">{line.sku.code}</p>
                    <p className="text-xs text-gray-500">
                      {line.sku.product.brand ?? "Unbranded"} · {line.sku.product.category ?? "—"}
                    </p>
                    {line.pricing ? (
                      <div className="space-y-1 text-[11px] text-gray-500">
                        <p>
                          {line.pricing.source === "price_list"
                            ? `Price list: ${line.pricing.priceListName ?? "Unknown"} (min ${line.pricing.minQuantity ?? 1})`
                            : "Fallback pricing applied"}
                        </p>
                        {line.pricing.allocations.length > 0 ? (
                          <ul className="space-y-0.5">
                            {line.pricing.allocations.map((allocation) => (
                              <li key={`${allocation.inventoryId}-${allocation.location}`}>
                                Hold: {allocation.quantity} @ {allocation.location}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{line.quantity}</td>
                  <td className="px-4 py-3">{currencyFormatter.format(line.unitPrice)}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {currencyFormatter.format(line.lineTotal)}
                  </td>
                  <td className="px-4 py-3">
                    {line.isSample ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-700">
                        Sample
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
            <p className="text-xs text-gray-500">Track payment status for this order.</p>
          </div>
          <Link
            href="/portal/invoices"
            className="text-xs font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
          >
            View all invoices
          </Link>
        </header>
        {order.invoices.length === 0 ? (
          <p className="mt-6 text-sm text-gray-600">No invoices generated yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-gray-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Issued</th>
                  <th className="px-4 py-3 text-left">Due</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">{invoice.status}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {currencyFormatter.format(invoice.total)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {currencyFormatter.format(invoice.balanceDue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
