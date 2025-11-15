import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();

    const skus = await prisma.sku.findMany({
      select: {
        code: true,
        region: true,
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { region: 'asc' },
        { code: 'asc' }
      ]
    });

    console.log(JSON.stringify(skus, null, 2));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
