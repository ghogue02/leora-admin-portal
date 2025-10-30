#!/usr/bin/env node

// Quick script to test database access and get tenant info
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Testing database connection...\n');

    // Try to get tenants
    const tenants = await prisma.tenant.findMany({
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        createdAt: true,
      }
    });

    console.log('✅ Successfully connected to database!\n');
    console.log(`📊 Found ${tenants.length} tenant(s):\n`);

    tenants.forEach((tenant, idx) => {
      console.log(`${idx + 1}. ${tenant.name} (${tenant.slug})`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Created: ${tenant.createdAt.toISOString()}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
