import { db } from "@/lib/prisma";

type OrderSearchResult = {
  id: string;
  label: string;
  subLabel: string;
  link: string;
  highlights: string[];
  score: number;
};

type OrderSearchParams = {
  tenantId: string;
  query: string;
  limit: number;
};

export async function searchOrders({
  tenantId,
  query,
  limit,
}: OrderSearchParams): Promise<OrderSearchResult[]> {
  const normalized = query.trim();
  const orders = await db.order.findMany({
    where: {
      tenantId,
      OR: [
        { orderNumber: { contains: normalized, mode: "insensitive" } },
        { customer: { name: { contains: normalized, mode: "insensitive" } } },
        { poNumber: { contains: normalized, mode: "insensitive" } },
        { specialInstructions: { contains: normalized, mode: "insensitive" } },
        { eventNotes: { contains: normalized, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      poNumber: true,
      status: true,
      total: true,
      orderedAt: true,
      specialInstructions: true,
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: limit,
    orderBy: { orderedAt: "desc" },
  });

  return orders.map((order) => ({
    id: order.id,
    label: order.orderNumber ?? `Order ${order.id.slice(0, 8)}`,
    subLabel: order.customer?.name ?? "Customer TBD",
    link: `/sales/orders/${order.id}`,
    highlights: [
      order.status ? `Status: ${order.status}` : null,
      order.total
        ? `Total ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(Number(order.total))}`
        : null,
      order.orderedAt ? `Ordered ${new Date(order.orderedAt).toLocaleDateString()}` : null,
      order.poNumber ? `PO: ${order.poNumber}` : null,
    ].filter((highlight): highlight is string => Boolean(highlight)),
    score: computeOrderScore(order, normalized),
  }));
}

type OrderRecord = {
  orderNumber: string | null;
  poNumber: string | null;
  customer?: { name: string | null };
};

function computeOrderScore(order: OrderRecord, query: string) {
  let score = 0;
  const normalizedQuery = query.toLowerCase();

  if (order.orderNumber?.toLowerCase().includes(normalizedQuery)) {
    score += 0.6;
  }

  if (order.customer?.name?.toLowerCase().includes(normalizedQuery)) {
    score += 0.3;
  }

  if (order.poNumber?.toLowerCase().includes(normalizedQuery)) {
    score += 0.2;
  }

  return Math.min(1, Math.max(0, score));
}
