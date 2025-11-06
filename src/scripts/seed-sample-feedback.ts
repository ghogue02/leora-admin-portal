/**
 * Seed Sample Feedback Templates
 *
 * Creates 11 default feedback templates for sample tracking:
 * - 4 Positive
 * - 4 Negative
 * - 3 Neutral
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FeedbackTemplate {
  category: 'Positive' | 'Negative' | 'Neutral';
  label: string;
  sortOrder: number;
}

const DEFAULT_TEMPLATES: FeedbackTemplate[] = [
  // Positive (4)
  { category: 'Positive', label: 'Loved it - wants to order', sortOrder: 1 },
  { category: 'Positive', label: 'Liked acidity', sortOrder: 2 },
  { category: 'Positive', label: 'Perfect for menu', sortOrder: 3 },
  { category: 'Positive', label: 'Price works', sortOrder: 4 },

  // Negative (4)
  { category: 'Negative', label: 'Too sweet', sortOrder: 5 },
  { category: 'Negative', label: 'Too expensive', sortOrder: 6 },
  { category: 'Negative', label: 'Not their style', sortOrder: 7 },
  { category: 'Negative', label: 'Have similar', sortOrder: 8 },

  // Neutral (3)
  { category: 'Neutral', label: 'Needs time', sortOrder: 9 },
  { category: 'Neutral', label: 'Will discuss with team', sortOrder: 10 },
  { category: 'Neutral', label: 'Interested but not now', sortOrder: 11 },
];

async function seedSampleFeedbackTemplates() {
  console.log('[Seed] Starting sample feedback template seeding...');

  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany();

    if (tenants.length === 0) {
      console.warn('[Seed] No tenants found. Skipping template seeding.');
      return;
    }

    console.log(`[Seed] Found ${tenants.length} tenant(s)`);

    for (const tenant of tenants) {
      console.log(`[Seed] Processing tenant: ${tenant.slug}`);

      // Check if templates already exist
      const existingCount = await prisma.sampleFeedbackTemplate.count({
        where: { tenantId: tenant.id },
      });

      if (existingCount > 0) {
        console.log(
          `[Seed] Tenant ${tenant.slug} already has ${existingCount} templates. Skipping.`
        );
        continue;
      }

      // Create all templates
      let created = 0;
      for (const template of DEFAULT_TEMPLATES) {
        try {
          await prisma.sampleFeedbackTemplate.create({
            data: {
              tenantId: tenant.id,
              category: template.category,
              label: template.label,
              sortOrder: template.sortOrder,
              isActive: true,
            },
          });
          created++;
        } catch (error) {
          console.error(
            `[Seed] Failed to create template "${template.label}" for ${tenant.slug}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      console.log(
        `[Seed] Created ${created}/${DEFAULT_TEMPLATES.length} templates for ${tenant.slug}`
      );
    }

    console.log('[Seed] Sample feedback template seeding completed successfully');
  } catch (error) {
    console.error('[Seed] Fatal error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedSampleFeedbackTemplates()
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedSampleFeedbackTemplates, DEFAULT_TEMPLATES };
