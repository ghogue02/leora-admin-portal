/**
 * Seed Activity Types
 *
 * Creates the 6 required activity types for the sales system:
 * 1. In-Person Visit (in_person)
 * 2. Tasting Appointment (in_person)
 * 3. Public Tasting Event (in_person)
 * 4. Follow-up - Phone Call (electronic)
 * 5. Follow-up - Email (electronic)
 * 6. Follow-up - Text Message (electronic)
 *
 * Note: The ActivityType model does not currently have a 'category' field.
 * The category is encoded in the description field for now.
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load from .env.local first (Next.js convention), then .env
config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running the seed script.");
}

const url = new URL(databaseUrl);
if (!url.searchParams.has("pgbouncer")) {
  url.searchParams.set("pgbouncer", "true");
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url.toString(),
    },
  },
});

const ACTIVITY_TYPES = [
  {
    code: "visit",
    name: "In-Person Visit",
    description: "In-person customer visit (category: in_person)",
  },
  {
    code: "tasting",
    name: "Tasting Appointment",
    description: "Scheduled tasting appointment with customer (category: in_person)",
  },
  {
    code: "event",
    name: "Public Tasting Event",
    description: "Public tasting event or trade show (category: in_person)",
  },
  {
    code: "call",
    name: "Follow-up - Phone Call",
    description: "Phone call follow-up (category: electronic)",
  },
  {
    code: "email",
    name: "Follow-up - Email",
    description: "Email follow-up (category: electronic)",
  },
  {
    code: "text",
    name: "Follow-up - Text Message",
    description: "Text message follow-up (category: electronic)",
  },
];

async function main() {
  console.log("🌱 Seeding activity types...\n");

  // Get the default tenant
  const tenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!tenant) {
    throw new Error("No tenant found. Please create a tenant first.");
  }

  console.log(`✓ Using tenant: ${tenant.name} (${tenant.slug})\n`);

  let created = 0;
  let updated = 0;

  for (const activityType of ACTIVITY_TYPES) {
    const existing = await prisma.activityType.findUnique({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: activityType.code,
        },
      },
    });

    if (existing) {
      // Update existing activity type
      await prisma.activityType.update({
        where: { id: existing.id },
        data: {
          name: activityType.name,
          description: activityType.description,
        },
      });
      console.log(`  ↻ Updated: ${activityType.name} (${activityType.code})`);
      updated++;
    } else {
      // Create new activity type
      await prisma.activityType.create({
        data: {
          tenantId: tenant.id,
          code: activityType.code,
          name: activityType.name,
          description: activityType.description,
        },
      });
      console.log(`  ✓ Created: ${activityType.name} (${activityType.code})`);
      created++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Activity types seeded successfully!");
  console.log("=".repeat(60));
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Total: ${ACTIVITY_TYPES.length}`);
  console.log();

  // Verify the data
  console.log("📋 Verifying activity types in database...\n");
  const allActivityTypes = await prisma.activityType.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ description: "asc" }, { name: "asc" }],
    select: {
      code: true,
      name: true,
      description: true,
    },
  });

  console.table(allActivityTypes);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("\n❌ Seeding failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
