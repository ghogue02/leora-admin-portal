/**
 * Seed script to create default automated triggers
 *
 * Usage:
 *   ts-node scripts/seed-default-triggers.ts <tenantId>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DefaultTrigger {
  triggerType: string;
  name: string;
  description: string;
  config: any;
  isActive: boolean;
}

const DEFAULT_TRIGGERS: DefaultTrigger[] = [
  {
    triggerType: "SAMPLE_NO_ORDER",
    name: "Sample Follow-up (7 days)",
    description:
      "Creates a follow-up task 7 days after a sample tasting if no order was placed",
    config: {
      daysAfter: 7,
      priority: "MEDIUM",
      taskTitle: "Follow up on sample tasting",
      taskDescription:
        "Customer tasted a sample but hasn't placed an order yet. Follow up to gauge interest.",
    },
    isActive: true,
  },
  {
    triggerType: "SAMPLE_NO_ORDER",
    name: "Sample Follow-up (30 days)",
    description:
      "Creates a second follow-up task 30 days after a sample tasting if still no order",
    config: {
      daysAfter: 30,
      priority: "LOW",
      taskTitle: "Long-term sample follow-up",
      taskDescription:
        "Customer tasted a sample 30 days ago. Check in to see if they're still interested.",
    },
    isActive: true,
  },
  {
    triggerType: "FIRST_ORDER_FOLLOWUP",
    name: "First Order Thank You",
    description:
      "Creates a thank you task 1 day after a customer's first order is delivered",
    config: {
      daysAfter: 1,
      priority: "HIGH",
      taskTitle: "Thank you call for first order",
      taskDescription:
        "First order was delivered. Call to thank them and ensure satisfaction.",
    },
    isActive: true,
  },
  {
    triggerType: "BURN_RATE_ALERT",
    name: "Reorder Check-in",
    description:
      "Creates a reorder reminder when customer is 20% past their average order interval",
    config: {
      percentageThreshold: 20,
      priority: "MEDIUM",
      taskTitle: "Reorder check-in",
      taskDescription:
        "Customer may be due for a reorder based on their historical ordering pace.",
    },
    isActive: true,
  },
];

async function seedDefaultTriggers(tenantId: string) {
  console.log(`Seeding default triggers for tenant: ${tenantId}`);

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Create each default trigger
  for (const triggerData of DEFAULT_TRIGGERS) {
    try {
      // Check if trigger already exists
      const existing = await prisma.automatedTrigger.findFirst({
        where: {
          tenantId,
          name: triggerData.name,
        },
      });

      if (existing) {
        console.log(`  ⏭️  Skipping existing trigger: ${triggerData.name}`);
        continue;
      }

      // Create trigger
      const trigger = await prisma.automatedTrigger.create({
        data: {
          tenantId,
          ...triggerData,
        },
      });

      console.log(`  ✅ Created trigger: ${trigger.name} (${trigger.triggerType})`);
    } catch (error) {
      console.error(`  ❌ Failed to create trigger: ${triggerData.name}`, error);
    }
  }

  console.log("✨ Default triggers seeded successfully!");
}

async function seedFeedbackTemplates(tenantId: string) {
  console.log(`Seeding feedback templates for tenant: ${tenantId}`);

  const templates = [
    // Positive feedback
    { category: "Positive", label: "Loved it", sortOrder: 1 },
    { category: "Positive", label: "Great quality", sortOrder: 2 },
    { category: "Positive", label: "Perfect for menu", sortOrder: 3 },
    { category: "Positive", label: "Good value", sortOrder: 4 },
    { category: "Positive", label: "Customers will love this", sortOrder: 5 },

    // Negative feedback
    { category: "Negative", label: "Too expensive", sortOrder: 10 },
    { category: "Negative", label: "Not their style", sortOrder: 11 },
    { category: "Negative", label: "Quality concerns", sortOrder: 12 },
    { category: "Negative", label: "Already have similar", sortOrder: 13 },

    // Neutral feedback
    { category: "Neutral", label: "Will consider", sortOrder: 20 },
    { category: "Neutral", label: "Need to think about it", sortOrder: 21 },
    { category: "Neutral", label: "Maybe for next season", sortOrder: 22 },
    { category: "Neutral", label: "Interested but timing not right", sortOrder: 23 },
  ];

  for (const template of templates) {
    try {
      const existing = await prisma.sampleFeedbackTemplate.findUnique({
        where: {
          tenantId_label: {
            tenantId,
            label: template.label,
          },
        },
      });

      if (existing) {
        console.log(`  ⏭️  Skipping existing template: ${template.label}`);
        continue;
      }

      await prisma.sampleFeedbackTemplate.create({
        data: {
          tenantId,
          ...template,
        },
      });

      console.log(`  ✅ Created template: ${template.label}`);
    } catch (error) {
      console.error(`  ❌ Failed to create template: ${template.label}`, error);
    }
  }

  console.log("✨ Feedback templates seeded successfully!");
}

async function main() {
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error("Usage: ts-node scripts/seed-default-triggers.ts <tenantId>");
    process.exit(1);
  }

  try {
    await seedDefaultTriggers(tenantId);
    await seedFeedbackTemplates(tenantId);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
