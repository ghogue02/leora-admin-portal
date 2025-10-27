import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tagDefinitions = [
  {
    code: 'wine_club',
    displayName: 'Wine Club',
    description: 'Customer participates in wine club programs',
    category: 'SEGMENT',
    color: '#8B5CF6', // Purple
    sortOrder: 1,
  },
  {
    code: 'events',
    displayName: 'Events',
    description: 'Customer purchases wine for events',
    category: 'SEGMENT',
    color: '#3B82F6', // Blue
    sortOrder: 2,
  },
  {
    code: 'female_winemakers',
    displayName: 'Female Winemakers',
    description: 'Customer prefers wines from female winemakers',
    category: 'PREFERENCE',
    color: '#EC4899', // Pink
    sortOrder: 3,
  },
  {
    code: 'organic',
    displayName: 'Organic',
    description: 'Customer prefers organic wines',
    category: 'PREFERENCE',
    color: '#10B981', // Green
    sortOrder: 4,
  },
  {
    code: 'natural_wine',
    displayName: 'Natural Wine',
    description: 'Customer prefers natural/minimal intervention wines',
    category: 'PREFERENCE',
    color: '#F59E0B', // Amber
    sortOrder: 5,
  },
  {
    code: 'biodynamic',
    displayName: 'Biodynamic',
    description: 'Customer prefers biodynamic wines',
    category: 'PREFERENCE',
    color: '#059669', // Emerald
    sortOrder: 6,
  },
];

async function seedTags() {
  console.log('🏷️  Seeding Tag Definitions...\n');

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('❌ No tenant found. Run main seed first.');
    process.exit(1);
  }

  console.log(`✓ Found tenant: ${tenant.name} (${tenant.slug})\n`);

  let created = 0;
  let updated = 0;

  for (const tag of tagDefinitions) {
    const existing = await prisma.tagDefinition.findUnique({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: tag.code,
        },
      },
    });

    if (existing) {
      await prisma.tagDefinition.update({
        where: { id: existing.id },
        data: tag,
      });
      console.log(`✓ Updated: ${tag.displayName}`);
      updated++;
    } else {
      await prisma.tagDefinition.create({
        data: {
          ...tag,
          tenantId: tenant.id,
        },
      });
      console.log(`✓ Created: ${tag.displayName}`);
      created++;
    }
  }

  console.log(`\n🎉 Seeding Complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${tagDefinitions.length}\n`);
}

seedTags()
  .catch((error) => {
    console.error('❌ Error seeding tags:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
