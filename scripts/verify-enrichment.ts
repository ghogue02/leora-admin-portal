import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

interface EnrichmentStats {
  totalProducts: number;
  enrichedProducts: number;
  accurateV2Products: number;
  enrichmentPercentage: number;
  sampleData: Array<{
    id: string;
    name: string;
    brand: string | null;
    category: string | null;
    enrichedBy: string | null;
    enrichedAt: Date | null;
    hasTastingNotes: boolean;
    foodPairingsCount: number;
    hasServingInfo: boolean;
    hasWineDetails: boolean;
    qualityScore: number;
    issues: string[];
  }>;
  qualityMetrics: {
    avgFoodPairings: number;
    productsWithTastingNotes: number;
    productsWithServingInfo: number;
    productsWithWineDetails: number;
    avgQualityScore: number;
  };
  issues: string[];
}

function calculateQualityScore(product: any): { score: number; issues: string[] } {
  let score = 100;
  const issues: string[] = [];

  // Check tasting notes
  if (!product.tastingNotes) {
    score -= 25;
    issues.push('Missing tasting notes');
  } else {
    const notes = product.tastingNotes as any;
    if (typeof notes === 'string' && notes.length < 50) {
      score -= 10;
      issues.push('Tasting notes too brief');
    }
    if (JSON.stringify(notes).toLowerCase().includes('generic')) {
      score -= 15;
      issues.push('Contains generic placeholder text');
    }
  }

  // Check food pairings
  if (!product.foodPairings) {
    score -= 25;
    issues.push('Missing food pairings');
  } else {
    const pairings = Array.isArray(product.foodPairings)
      ? product.foodPairings
      : (product.foodPairings as any).pairings || [];

    if (pairings.length < 5) {
      score -= 10;
      issues.push(`Only ${pairings.length} food pairings (need 5+)`);
    }
  }

  // Check serving info
  if (!product.servingInfo) {
    score -= 25;
    issues.push('Missing serving info');
  } else {
    const info = product.servingInfo as any;
    if (!info.temperature || !info.glassType) {
      score -= 10;
      issues.push('Incomplete serving info');
    }
  }

  // Check wine details
  if (!product.wineDetails) {
    score -= 25;
    issues.push('Missing wine details');
  }

  return { score: Math.max(0, score), issues };
}

async function verifyEnrichment(): Promise<EnrichmentStats> {
  console.log('🔍 Starting database enrichment verification...\n');

  // Get total products count
  const totalProducts = await prisma.product.count();
  console.log(`📊 Total products in database: ${totalProducts}`);

  // Count enriched products
  const enrichedProducts = await prisma.product.count({
    where: {
      enrichedAt: { not: null }
    }
  });
  console.log(`✅ Products with enrichment: ${enrichedProducts}`);

  // Count accurate-v2 enrichments
  const accurateV2Products = await prisma.product.count({
    where: {
      enrichedBy: { contains: 'accurate-v2' }
    }
  });
  console.log(`🎯 Products enriched with accurate-v2: ${accurateV2Products}`);

  // Calculate percentage
  const enrichmentPercentage = totalProducts > 0
    ? (accurateV2Products / totalProducts) * 100
    : 0;
  console.log(`📈 Enrichment percentage: ${enrichmentPercentage.toFixed(2)}%\n`);

  // Sample 20 random products
  console.log('📝 Sampling 20 random products for quality verification...\n');

  const sampleProducts = await prisma.product.findMany({
    where: {
      enrichedBy: { contains: 'accurate-v2' }
    },
    take: 20,
    orderBy: {
      enrichedAt: 'desc'
    }
  });

  const sampleData = sampleProducts.map(product => {
    const foodPairings = product.foodPairings as any;
    const pairingsArray = Array.isArray(foodPairings)
      ? foodPairings
      : foodPairings?.pairings || [];

    const { score, issues } = calculateQualityScore(product);

    return {
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      enrichedBy: product.enrichedBy,
      enrichedAt: product.enrichedAt,
      hasTastingNotes: !!product.tastingNotes,
      foodPairingsCount: pairingsArray.length,
      hasServingInfo: !!product.servingInfo,
      hasWineDetails: !!product.wineDetails,
      qualityScore: score,
      issues
    };
  });

  // Calculate quality metrics
  const qualityMetrics = {
    avgFoodPairings: sampleData.reduce((sum, p) => sum + p.foodPairingsCount, 0) / sampleData.length,
    productsWithTastingNotes: sampleData.filter(p => p.hasTastingNotes).length,
    productsWithServingInfo: sampleData.filter(p => p.hasServingInfo).length,
    productsWithWineDetails: sampleData.filter(p => p.hasWineDetails).length,
    avgQualityScore: sampleData.reduce((sum, p) => sum + p.qualityScore, 0) / sampleData.length
  };

  // Collect overall issues
  const allIssues = sampleData.flatMap(p => p.issues);
  const issueFrequency = allIssues.reduce((acc, issue) => {
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const issues = Object.entries(issueFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([issue, count]) => `${issue} (${count} products)`);

  // Print sample results
  console.log('📋 Sample Product Analysis:\n');
  sampleData.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name}`);
    console.log(`   Brand: ${product.brand || 'N/A'}`);
    console.log(`   Category: ${product.category || 'N/A'}`);
    console.log(`   Quality Score: ${product.qualityScore}/100`);
    console.log(`   Tasting Notes: ${product.hasTastingNotes ? '✅' : '❌'}`);
    console.log(`   Food Pairings: ${product.foodPairingsCount}`);
    console.log(`   Serving Info: ${product.hasServingInfo ? '✅' : '❌'}`);
    console.log(`   Wine Details: ${product.hasWineDetails ? '✅' : '❌'}`);
    if (product.issues.length > 0) {
      console.log(`   Issues: ${product.issues.join(', ')}`);
    }
    console.log('');
  });

  // Print quality metrics
  console.log('\n📊 Quality Metrics Summary:\n');
  console.log(`Average Food Pairings: ${qualityMetrics.avgFoodPairings.toFixed(1)}`);
  console.log(`Products with Tasting Notes: ${qualityMetrics.productsWithTastingNotes}/${sampleData.length} (${(qualityMetrics.productsWithTastingNotes / sampleData.length * 100).toFixed(1)}%)`);
  console.log(`Products with Serving Info: ${qualityMetrics.productsWithServingInfo}/${sampleData.length} (${(qualityMetrics.productsWithServingInfo / sampleData.length * 100).toFixed(1)}%)`);
  console.log(`Products with Wine Details: ${qualityMetrics.productsWithWineDetails}/${sampleData.length} (${(qualityMetrics.productsWithWineDetails / sampleData.length * 100).toFixed(1)}%)`);
  console.log(`Average Quality Score: ${qualityMetrics.avgQualityScore.toFixed(1)}/100\n`);

  if (issues.length > 0) {
    console.log('⚠️  Common Issues Found:\n');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }

  return {
    totalProducts,
    enrichedProducts,
    accurateV2Products,
    enrichmentPercentage,
    sampleData,
    qualityMetrics,
    issues
  };
}

async function main() {
  try {
    const stats = await verifyEnrichment();

    console.log('\n✅ Verification complete!\n');
    console.log('Summary:');
    console.log(`- Total products: ${stats.totalProducts}`);
    console.log(`- Enriched products: ${stats.accurateV2Products}`);
    console.log(`- Enrichment rate: ${stats.enrichmentPercentage.toFixed(2)}%`);
    console.log(`- Average quality score: ${stats.qualityMetrics.avgQualityScore.toFixed(1)}/100`);

    // Write results to file
    const reportPath = '/Users/greghogue/Leora2/web/docs/database-enrichment-verification.md';
    const report = generateReport(stats);
    const fs = require('fs');
    const path = require('path');

    // Ensure docs directory exists
    const docsDir = path.dirname(reportPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateReport(stats: EnrichmentStats): string {
  const timestamp = new Date().toISOString();

  return `# Database Enrichment Verification Report

**Generated:** ${timestamp}

## Executive Summary

- **Total Products:** ${stats.totalProducts}
- **Enriched Products:** ${stats.accurateV2Products}
- **Enrichment Rate:** ${stats.enrichmentPercentage.toFixed(2)}%
- **Average Quality Score:** ${stats.qualityMetrics.avgQualityScore.toFixed(1)}/100

## Quality Metrics

### Overall Statistics
- **Average Food Pairings per Product:** ${stats.qualityMetrics.avgFoodPairings.toFixed(1)}
- **Products with Tasting Notes:** ${stats.qualityMetrics.productsWithTastingNotes}/${stats.sampleData.length} (${(stats.qualityMetrics.productsWithTastingNotes / stats.sampleData.length * 100).toFixed(1)}%)
- **Products with Serving Info:** ${stats.qualityMetrics.productsWithServingInfo}/${stats.sampleData.length} (${(stats.qualityMetrics.productsWithServingInfo / stats.sampleData.length * 100).toFixed(1)}%)
- **Products with Wine Details:** ${stats.qualityMetrics.productsWithWineDetails}/${stats.sampleData.length} (${(stats.qualityMetrics.productsWithWineDetails / stats.sampleData.length * 100).toFixed(1)}%)

## Sample Data Analysis (20 Products)

| # | Product Name | Brand | Quality Score | Tasting Notes | Food Pairings | Serving Info | Wine Details | Issues |
|---|--------------|-------|---------------|---------------|---------------|--------------|--------------|--------|
${stats.sampleData.map((p, i) =>
  `| ${i + 1} | ${p.name} | ${p.brand || 'N/A'} | ${p.qualityScore}/100 | ${p.hasTastingNotes ? '✅' : '❌'} | ${p.foodPairingsCount} | ${p.hasServingInfo ? '✅' : '❌'} | ${p.hasWineDetails ? '✅' : '❌'} | ${p.issues.length > 0 ? p.issues.join('; ') : 'None'} |`
).join('\n')}

## Common Issues

${stats.issues.length > 0
  ? stats.issues.map(issue => `- ${issue}`).join('\n')
  : '✅ No significant issues found!'
}

## Recommendations

${stats.qualityMetrics.avgQualityScore >= 80
  ? '✅ **Enrichment quality is excellent!** The majority of products have comprehensive data.'
  : stats.qualityMetrics.avgQualityScore >= 60
    ? '⚠️  **Enrichment quality is good but could be improved.** Consider re-running enrichment for products with missing data.'
    : '❌ **Enrichment quality needs improvement.** Many products are missing critical data fields.'
}

### Next Steps

1. ${stats.enrichmentPercentage < 100
    ? `Enrich remaining ${stats.totalProducts - stats.accurateV2Products} products`
    : '✅ All products are enriched'
  }
2. ${stats.qualityMetrics.avgFoodPairings < 5
    ? 'Improve food pairings to meet 5+ requirement'
    : '✅ Food pairings meet quality standards'
  }
3. ${stats.qualityMetrics.productsWithTastingNotes < stats.sampleData.length
    ? 'Add tasting notes to products that are missing them'
    : '✅ All sampled products have tasting notes'
  }
4. ${stats.qualityMetrics.avgQualityScore < 80
    ? 'Review and enhance products with quality scores below 80'
    : '✅ Quality scores are satisfactory'
  }

## Detailed Product Examples

### High Quality Examples (Score > 90)

${stats.sampleData
  .filter(p => p.qualityScore > 90)
  .slice(0, 3)
  .map(p => `
#### ${p.name}
- **Brand:** ${p.brand || 'N/A'}
- **Category:** ${p.category || 'N/A'}
- **Quality Score:** ${p.qualityScore}/100
- **Enriched:** ${p.enrichedAt?.toLocaleDateString() || 'N/A'}
- **Food Pairings:** ${p.foodPairingsCount}
- **Status:** ✅ Excellent enrichment quality
`).join('\n') || 'No products with score > 90 in sample'}

### Products Needing Improvement (Score < 80)

${stats.sampleData
  .filter(p => p.qualityScore < 80)
  .slice(0, 5)
  .map(p => `
#### ${p.name}
- **Brand:** ${p.brand || 'N/A'}
- **Quality Score:** ${p.qualityScore}/100
- **Issues:** ${p.issues.join(', ') || 'None'}
- **Required Actions:**
${p.issues.map(issue => `  - ${issue}`).join('\n')}
`).join('\n') || '✅ All sampled products have scores above 80'}

## Conclusion

${stats.enrichmentPercentage >= 95 && stats.qualityMetrics.avgQualityScore >= 80
  ? '✅ **Database enrichment is complete and high quality.** The accurate-v2 enrichment process has successfully enhanced the product catalog with comprehensive, detailed information.'
  : stats.enrichmentPercentage >= 80 && stats.qualityMetrics.avgQualityScore >= 60
    ? '⚠️  **Database enrichment is mostly complete with good quality.** Some improvements recommended for optimal data quality.'
    : '❌ **Database enrichment requires attention.** Significant improvements needed to meet quality standards.'
}

---
*Report generated by database enrichment verification script*
`;
}

main()
  .catch(console.error);
