import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { FlagDuplicateButton } from "./FlagDuplicateButton";
import { PortalContactList } from "./ContactList";

type DeliveryWindow =
  | {
      type: "BEFORE";
      time: string;
    }
  | {
      type: "AFTER";
      time: string;
    }
  | {
      type: "BETWEEN";
      startTime: string;
      endTime: string;
    };

type CustomerDetail = {
  id: string;
  name: string;
  accountNumber: string | null;
  billingEmail: string | null;
  phone: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  paymentTerms: string | null;
  licenseNumber: string | null;
  deliveryInstructions: string | null;
  deliveryMethod: string | null;
  paymentMethod: string | null;
  defaultWarehouseLocation: string | null;
  deliveryWindows: DeliveryWindow[];
  orderingPaceDays: number | null;
  establishedRevenue: number | null;
  contactName: string | null;
  createdAt: string;
  updatedAt: string;
  lastOrderDate: string | null;
  nextExpectedOrderDate: string | null;
  riskStatus: string;
  dormancySince: string | null;
  firstOrderDate: string | null;
  healthSummary: {
    riskStatus: string;
    cadenceBaselineDays: number;
    graceDays: number;
    dormantThresholdDays: number;
    daysSinceLastOrder: number | null;
    lastOrderDate: string | null;
    nextExpectedOrderDate: string | null;
    dormancySince: string | null;
    explanation: string;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    openExposure: number;
    openOrderCount: number;
    outstandingBalance: number;
    averageOrderValue: number;
    totalInvoiced: number;
    totalPayments: number;
    lastOrderAt: string | null;
    lastInvoiceAt: string | null;
    invoiceCount: number;
  };
  addresses: Array<{
    id: string;
    label: string;
    street1: string;
    street2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
    isDefault: boolean;
  }>;
  portalUsers: Array<{
    id: string;
    email: string;
    fullName: string;
    status: string;
    lastLoginAt: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    orderedAt: string | null;
    total: number | null;
    currency: string;
    invoiceTotal: number;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string | null;
    status: string;
    total: number;
    balanceDue: number;
    issuedAt: string | null;
    dueDate: string | null;
    orderId: string | null;
  }>;
  recentActivities: Array<{
    id: string;
    subject: string | null;
    notes: string | null;
    occurredAt: string | null;
  }>;
  contacts: Array<{
    id: string;
    fullName: string;
    role: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    notes: string | null;
    businessCardUrl: string | null;
    createdAt: string;
  }>;
};

type CustomerResponse = {
  customer: CustomerDetail;
};

async function fetchCustomer(customerId: string): Promise<CustomerDetail> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) {
    throw new Error("Unable to resolve host for customer fetch.");
  }
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const cookie = headerStore.get("cookie") ?? undefined;

  const response = await fetch(`${baseUrl}/api/portal/customers/${customerId}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Unable to load customer details.");
  }

  const payload = (await response.json()) as CustomerResponse;
  return payload.customer;
}

type CustomerPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

const currencyFormatter = (fractionDigits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: fractionDigits,
  });

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatMoney(value: number | null, fractionDigits = 0) {
  return currencyFormatter(fractionDigits).format(value ?? 0);
}

function formatDeliveryWindow(window: DeliveryWindow) {
  switch (window.type) {
    case "BEFORE":
      return `Before ${window.time}`;
    case "AFTER":
      return `After ${window.time}`;
    case "BETWEEN":
      return `Between ${window.startTime} – ${window.endTime}`;
    default:
      return "Custom window";
  }
}

const riskStatusStyles: Record<string, string> = {
  HEALTHY: "bg-emerald-100 text-emerald-800 border-emerald-200",
  AT_RISK_CADENCE: "bg-amber-100 text-amber-800 border-amber-200",
  AT_RISK_REVENUE: "bg-amber-100 text-amber-800 border-amber-200",
  DORMANT: "bg-rose-100 text-rose-800 border-rose-200",
  CLOSED: "bg-slate-200 text-slate-700 border-slate-300",
};

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
  const { customerId } = await params;
  const customer = await fetchCustomer(customerId);
  const healthSummary = customer.healthSummary;
  const riskBadgeClass = riskStatusStyles[customer.riskStatus] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const firstOrderDate = customer.firstOrderDate ? new Date(customer.firstOrderDate) : null;
  const customerSinceValue = firstOrderDate ? format(firstOrderDate, "MMMM d, yyyy") : "No orders yet";
  const customerSinceHint = firstOrderDate
    ? `First recorded order ${formatDistanceToNow(firstOrderDate, { addSuffix: true })}`
    : "First order has not been recorded yet.";

  const statCards = [
    {
      label: "Customer since",
      value: customerSinceValue,
      hint: customerSinceHint,
    },
    {
      label: "Total orders",
      value: integerFormatter.format(customer.stats.totalOrders),
      hint: "All historical orders synced from Supabase.",
    },
    {
      label: "Lifetime revenue",
      value: formatMoney(customer.stats.totalRevenue),
      hint: "Sum of all order totals recorded for this customer.",
    },
    {
      label: "Open exposure",
      value: formatMoney(customer.stats.openExposure),
      hint: `${integerFormatter.format(customer.stats.openOrderCount)} order${
        customer.stats.openOrderCount === 1 ? "" : "s"
      } currently in fulfillment.`,
    },
    {
      label: "Outstanding balance",
      value: formatMoney(customer.stats.outstandingBalance),
      hint: `Invoices: ${integerFormatter.format(customer.stats.invoiceCount)} · Payments: ${formatMoney(customer.stats.totalPayments)}`,
    },
  ] as const;

  const secondaryStats = [
    {
      label: "Average order value",
      value: formatMoney(customer.stats.averageOrderValue, 2),
    },
    {
      label: "Last order",
      value: formatDate(customer.stats.lastOrderAt),
    },
    {
      label: "Last invoice",
      value: formatDate(customer.stats.lastInvoiceAt),
    },
    {
      label: "Established revenue",
      value: customer.establishedRevenue !== null ? formatMoney(customer.establishedRevenue) : "—",
    },
  ] as const;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Customer</p>
        <h1 className="text-3xl font-semibold text-gray-900">{customer.name}</h1>
        <div className="flex flex-col gap-3 text-sm text-gray-600">
          <div>
            <p>
              Customer ID:{" "}
              <span className="font-mono text-xs text-gray-500">{customer.id.slice(0, 8)}…</span>
            </p>
            {customer.accountNumber ? <p>Account #: {customer.accountNumber}</p> : null}
            <p>Last updated {new Date(customer.updatedAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${riskBadgeClass}`}>
              {customer.riskStatus.replaceAll("_", " ")}
            </span>
            {healthSummary?.daysSinceLastOrder !== null ? (
              <span className="text-xs text-gray-500">
                {`${healthSummary.daysSinceLastOrder} days since last delivery`}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FlagDuplicateButton customerId={customer.id} customerName={customer.name} />
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
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
            <p className="mt-2 text-xs text-gray-500">{card.hint}</p>
          </div>
        ))}
      </section>

      {healthSummary ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Cadence insight</h2>
          <p className="mt-2 text-sm text-gray-700">{healthSummary.explanation}</p>
          <dl className="mt-4 grid gap-4 text-xs text-gray-500 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-medium text-gray-700">Cadence baseline</dt>
              <dd>{healthSummary.cadenceBaselineDays} days</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Grace window</dt>
              <dd>{healthSummary.graceDays} days</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Dormant threshold</dt>
              <dd>{healthSummary.dormantThresholdDays} days</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Days since last order</dt>
              <dd>{healthSummary.daysSinceLastOrder ?? "—"}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        {secondaryStats.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {card.label}
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Contact & Billing</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-gray-700">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Primary contact</dt>
              <dd>{customer.contactName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Email</dt>
              <dd>{customer.billingEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Phone</dt>
              <dd>{customer.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Payment terms</dt>
              <dd>{customer.paymentTerms ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Ordering cadence</dt>
              <dd>
                {customer.orderingPaceDays
                  ? `${customer.orderingPaceDays} days`
                  : "No cadence recorded"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Established revenue</dt>
              <dd>
                {customer.establishedRevenue !== null
                  ? formatMoney(customer.establishedRevenue)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">License number</dt>
              <dd>{customer.licenseNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Preferred payment method</dt>
              <dd>{customer.paymentMethod ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Delivery method</dt>
              <dd>{customer.deliveryMethod ?? "Not specified"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Addresses</h2>
          {customer.addresses.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">
              No saved addresses. Add one from the admin portal when ready.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              {customer.addresses.map((address) => (
                <li key={address.id} className="rounded border border-slate-200 p-3">
                  <p className="font-semibold text-gray-900">
                    {address.label}
                    {address.isDefault ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p>{address.street1}</p>
                  {address.street2 ? <p>{address.street2}</p> : null}
                  <p>
                    {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p>{address.country}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Delivery & Payment Preferences</h2>
        <p className="text-xs text-gray-500">
          Guidance for drivers and logistics teams fulfilling this account.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm text-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Instructions</p>
            <p className="mt-2">
              {customer.deliveryInstructions?.trim()
                ? customer.deliveryInstructions
                : "No specific delivery instructions recorded."}
            </p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm text-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery windows</p>
            {customer.deliveryWindows?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {customer.deliveryWindows.map((window, index) => (
                  <li key={`${window.type}-${index}`}>{formatDeliveryWindow(window)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">Flexible / no preferred window.</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-gray-700">
          <div className="rounded-md border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Payment terms
            </p>
            <p className="mt-2">{customer.paymentTerms ?? "Not specified"}</p>
          </div>
          <div className="rounded-md border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Warehouse source
            </p>
            <p className="mt-2">{customer.defaultWarehouseLocation ?? "Not specified"}</p>
          </div>
          <div className="rounded-md border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Preferred payment method
            </p>
            <p className="mt-2">{customer.paymentMethod ?? "Not specified"}</p>
          </div>
        </div>
      </section>

      {customer.contacts.length > 0 ? (
        <PortalContactList contacts={customer.contacts} />
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Portal users</h2>
            <p className="text-xs text-gray-500">
              Users associated with this customer in the portal.
            </p>
          </div>
        </div>

        {customer.portalUsers.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No portal users are linked to this account.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-gray-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customer.portalUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{user.fullName}</td>
                    <td className="px-4 py-3 text-gray-700">{user.email}</td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wide text-gray-500">
                      {user.status}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent orders</h2>
              <p className="text-xs text-gray-500">Latest activity for this customer.</p>
            </div>
            <Link
              href="/portal/orders"
              className="text-xs font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
            >
              View all orders
            </Link>
          </div>
          {customer.recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No orders have been recorded yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-gray-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Order</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Ordered</th>
                    <th className="px-4 py-2 text-left">Total</th>
                    <th className="px-4 py-2 text-left">Invoices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customer.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/portal/orders/${order.id}`}
                          className="font-medium text-gray-900 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
                        >
                          #{order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{order.status}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {order.orderedAt ? new Date(order.orderedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {order.total !== null ? formatMoney(order.total) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatMoney(order.invoiceTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent invoices</h2>
              <p className="text-xs text-gray-500">Latest billing events for this customer.</p>
            </div>
            <Link
              href="/portal/invoices"
              className="text-xs font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
            >
              View all invoices
            </Link>
          </div>
          {customer.recentInvoices.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No invoices have been issued yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm text-gray-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Invoice</th>
                    <th className="px-4 py-2 text-left">Issued</th>
                    <th className="px-4 py-2 text-left">Total</th>
                    <th className="px-4 py-2 text-left">Balance</th>
                    <th className="px-4 py-2 text-left">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customer.recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500">{invoice.status}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatMoney(invoice.total)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatMoney(invoice.balanceDue)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {invoice.orderId ? (
                          <Link
                            href={`/portal/orders/${invoice.orderId}`}
                            className="font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
                          >
                            #{invoice.orderId.slice(0, 8)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent activities</h2>
        {customer.recentActivities.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No activity logs captured for this customer yet.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            {customer.recentActivities.map((activity) => (
              <li key={activity.id} className="rounded border border-slate-200 p-3">
                <p className="font-semibold text-gray-900">
                  {activity.subject ?? "Activity"}
                </p>
                <p className="text-xs text-gray-500">{formatDate(activity.occurredAt)}</p>
                {activity.notes ? <p className="mt-2 text-gray-700">{activity.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
