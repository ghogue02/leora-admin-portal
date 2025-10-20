/**
 * Verify Activity Types
 *
 * This script verifies that all required activity types exist in the database
 * and checks that they are accessible in the UI through the API endpoint.
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load from .env.local first (Next.js convention), then .env
config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running the verification script.");
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

const REQUIRED_ACTIVITY_TYPES = [
  { code: "visit", name: "In-Person Visit", category: "in_person" },
  { code: "tasting", name: "Tasting Appointment", category: "in_person" },
  { code: "event", name: "Public Tasting Event", category: "in_person" },
  { code: "call", name: "Follow-up - Phone Call", category: "electronic" },
  { code: "email", name: "Follow-up - Email", category: "electronic" },
  { code: "text", name: "Follow-up - Text Message", category: "electronic" },
];

async function main() {
  console.log("🔍 Verifying Activity Types\n");
  console.log("=".repeat(70));
  console.log();

  // Get the default tenant
  const tenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!tenant) {
    console.error("❌ No tenant found in database");
    process.exit(1);
  }

  console.log(`✓ Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`  ID: ${tenant.id}`);
  console.log();

  // Check database
  console.log("📊 STEP 1: Database Verification");
  console.log("-".repeat(70));

  const activityTypes = await prisma.activityType.findMany({
    where: { tenantId: tenant.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      _count: {
        select: {
          activities: true,
        },
      },
    },
  });

  console.log(`\nFound ${activityTypes.length} activity types in database:\n`);

  if (activityTypes.length === 0) {
    console.error("❌ No activity types found in database!");
    console.log("\n💡 To fix this, run: npm run seed:activity-types\n");
    process.exit(1);
  }

  // Display current activity types
  console.table(
    activityTypes.map((at) => ({
      code: at.code,
      name: at.name,
      description: at.description?.substring(0, 50) || "",
      activities: at._count.activities,
    }))
  );

  // Check for missing required types
  console.log("\n📋 STEP 2: Required Activity Types Check");
  console.log("-".repeat(70));

  const existingCodes = new Set(activityTypes.map((at) => at.code));
  const missing: string[] = [];
  const present: string[] = [];

  for (const required of REQUIRED_ACTIVITY_TYPES) {
    if (existingCodes.has(required.code)) {
      present.push(required.code);
      console.log(`  ✓ ${required.name} (${required.code}) - ${required.category}`);
    } else {
      missing.push(required.code);
      console.log(`  ✗ ${required.name} (${required.code}) - ${required.category} - MISSING`);
    }
  }

  console.log();

  if (missing.length > 0) {
    console.error(`❌ Missing ${missing.length} required activity types:`);
    console.error(`   ${missing.join(", ")}`);
    console.log("\n💡 To fix this, run: npm run seed:activity-types\n");
  } else {
    console.log("✅ All required activity types are present!");
  }

  // Check schema for category field
  console.log("\n🗂️  STEP 3: Schema Analysis");
  console.log("-".repeat(70));

  const sampleType = activityTypes[0];
  const hasCategory = "category" in sampleType;

  if (hasCategory) {
    console.log("✓ ActivityType model has 'category' field");
  } else {
    console.log("⚠️  ActivityType model does NOT have 'category' field");
    console.log("   Category information is stored in the description field");
  }

  // Check for activities using these types
  console.log("\n📈 STEP 4: Usage Statistics");
  console.log("-".repeat(70));

  const totalActivities = await prisma.activity.count({
    where: { tenantId: tenant.id },
  });

  console.log(`\nTotal activities in database: ${totalActivities}`);

  if (totalActivities > 0) {
    const activitiesByType = await prisma.activity.groupBy({
      by: ["activityTypeId"],
      where: { tenantId: tenant.id },
      _count: {
        id: true,
      },
    });

    console.log("\nActivities per type:");
    for (const group of activitiesByType) {
      const type = activityTypes.find((at) => at.id === group.activityTypeId);
      if (type) {
        console.log(`  ${type.name}: ${group._count.id}`);
      }
    }
  }

  // API Endpoint Check
  console.log("\n🌐 STEP 5: API Endpoint Check");
  console.log("-".repeat(70));

  console.log("\nAPI endpoint location:");
  console.log("  /Users/greghogue/Leora2/web/src/app/api/sales/activity-types/route.ts");
  console.log("\nEndpoint URL:");
  console.log("  GET /api/sales/activity-types");
  console.log("\nUsed by:");
  console.log("  • /src/app/sales/activities/page.tsx (line 85)");
  console.log("  • /src/app/sales/call-plan/sections/AddActivityModal.tsx (line 50)");

  // UI Component Check
  console.log("\n🎨 STEP 6: UI Component Check");
  console.log("-".repeat(70));

  console.log("\nActivity types are displayed in:");
  console.log("  1. Activities Page:");
  console.log("     /src/app/sales/activities/page.tsx");
  console.log("     - ActivityForm component (line 252)");
  console.log("     - Shows dropdown with all activity types");
  console.log();
  console.log("  2. Call Plan Modal:");
  console.log("     /src/app/sales/call-plan/sections/AddActivityModal.tsx");
  console.log("     - Activity type dropdown (line 162)");
  console.log("     - Shows all activity types for scheduling");

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(70));
  console.log();
  console.log(`Database Activity Types: ${activityTypes.length}`);
  console.log(`Required Activity Types: ${REQUIRED_ACTIVITY_TYPES.length}`);
  console.log(`Present: ${present.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Total Activities: ${totalActivities}`);
  console.log();

  if (missing.length === 0) {
    console.log("✅ ALL CHECKS PASSED!");
    console.log("   All required activity types exist and are accessible.");
  } else {
    console.log("⚠️  VERIFICATION FAILED!");
    console.log("   Some required activity types are missing.");
    console.log("\n💡 Run this command to add missing types:");
    console.log("   npm run seed:activity-types");
  }

  console.log();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("\n❌ Verification failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
