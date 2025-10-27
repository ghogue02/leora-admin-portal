import CustomerDetailClient from "./CustomerDetailClient";

type PageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function CustomerDetailPage({ params }: PageProps) {
  const { customerId } = await params;

  return <CustomerDetailClient customerId={customerId} />;
}
