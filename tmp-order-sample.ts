import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: {
      tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed',
      AND: {
        lines: {
          some: {
            quantity: { gt: 0 },
          },
        },
      },
    },
    include: {
      lines: true,
      invoices: true,
    },
  });

  console.log(order?.total, order?.lines[0]?.quantity);
}

main().finally(async () => {
  await prisma.$disconnect();
});
