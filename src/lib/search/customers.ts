import { db } from "@/lib/prisma";

type CustomerSearchResult = {
  id: string;
  label: string;
  subLabel: string;
  link: string;
  highlights: string[];
  score: number;
};

type CustomerSearchParams = {
  tenantId: string;
  query: string;
  limit: number;
};

export async function searchCustomers({
  tenantId,
  query,
  limit,
}: CustomerSearchParams): Promise<CustomerSearchResult[]> {
  const normalized = query.trim();
  const customers = await db.customer.findMany({
    where: {
      tenantId,
      OR: [
        { name: { contains: normalized, mode: "insensitive" } },
        { accountNumber: { contains: normalized, mode: "insensitive" } },
        { billingEmail: { contains: normalized, mode: "insensitive" } },
        { phone: { contains: normalized, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      accountNumber: true,
      billingEmail: true,
      phone: true,
      accountType: true,
      accountPriority: true,
    },
    take: limit,
    orderBy: { name: "asc" },
  });

  return customers.map((customer) => ({
    id: customer.id,
    label: customer.name ?? "Unnamed Account",
    subLabel: customer.accountNumber ?? customer.billingEmail ?? customer.phone ?? "",
    link: `/sales/customers/${customer.id}`,
    highlights: [
      customer.accountType ? `Type: ${customer.accountType}` : null,
      customer.accountPriority ? `Priority: ${customer.accountPriority}` : null,
      customer.phone ? `Phone: ${customer.phone}` : null,
    ].filter((highlight): highlight is string => Boolean(highlight)),
    score: computeCustomerScore(customer, normalized),
  }));
}

type CustomerRecord = {
  name: string | null;
  accountNumber: string | null;
  billingEmail: string | null;
  phone: string | null;
};

function computeCustomerScore(customer: CustomerRecord, query: string) {
  let score = 0;
  const normalizedQuery = query.toLowerCase();
  const normalizedName = customer.name?.toLowerCase() ?? "";
  const normalizedAccountNumber = customer.accountNumber?.toLowerCase() ?? "";
  const normalizedEmail = customer.billingEmail?.toLowerCase() ?? "";

  if (normalizedName.startsWith(normalizedQuery)) {
    score += 0.5;
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 0.3;
  }

  if (normalizedAccountNumber.includes(normalizedQuery)) {
    score += 0.3;
  }

  if (normalizedEmail.includes(normalizedQuery)) {
    score += 0.2;
  }

  return Math.min(1, Math.max(0, score));
}
