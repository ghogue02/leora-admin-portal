#!/usr/bin/env tsx
/**
 * Set passwords for sales rep users
 * Usage: npx tsx scripts/set-sales-rep-passwords.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config();

const prisma = new PrismaClient();

async function setPasswords() {
  console.log("🔐 Setting passwords for sales rep users...\n");

  const password = "SalesDemo2025"; // Same as Travis's demo password
  const hashedPassword = await bcrypt.hash(password, 10);

  const salesReps = [
    { email: "kelly@wellcraftedbeverage.com", name: "Kelly Neel" },
    { email: "travis@wellcraftedbeverage.com", name: "Travis Vernon" },
    { email: "carolyn@wellcraftedbeverage.com", name: "Carolyn Vernon" },
  ];

  for (const rep of salesReps) {
    try {
      await prisma.user.update({
        where: {
          tenantId_email: {
            tenantId: await getTenantId(),
            email: rep.email,
          },
        },
        data: {
          hashedPassword,
        },
      });
      console.log(`  ✓ Set password for ${rep.name} (${rep.email})`);
    } catch (error) {
      console.error(`  ✗ Failed to set password for ${rep.email}:`, error);
    }
  }

  console.log(`\n✅ Passwords set successfully!`);
  console.log(`\nLogin credentials:`);
  console.log(`  Email: kelly@wellcraftedbeverage.com`);
  console.log(`  Email: travis@wellcraftedbeverage.com`);
  console.log(`  Email: carolyn@wellcraftedbeverage.com`);
  console.log(`  Password: ${password}`);
  console.log(`\n🌐 Visit: http://localhost:3000/sales/login\n`);
}

async function getTenantId(): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "well-crafted" },
    select: { id: true },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant.id;
}

setPasswords()
  .catch((error) => {
    console.error("Error setting passwords:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
