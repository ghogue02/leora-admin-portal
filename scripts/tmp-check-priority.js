const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const customers = await prisma.customer.findMany({ take: 20 });
  for (const customer of customers) {
    const agg = await prisma.order.aggregate({
      where: {
        customerId: customer.id,
        status: { not: 'CANCELLED' },
        orderedAt: { gte: sixMonthsAgo },
      },
      _sum: { total: true },
    });
    const total = Number(agg._sum.total ?? 0);
    console.log(customer.name, 'avg monthly', (total / 6).toFixed(2));
  }
})()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
