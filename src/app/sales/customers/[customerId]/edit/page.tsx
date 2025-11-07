import CustomerEditClient from "./CustomerEditClient";

type PageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function CustomerEditPage({ params }: PageProps) {
  const { customerId } = await params;

  return <CustomerEditClient customerId={customerId} />;
}
