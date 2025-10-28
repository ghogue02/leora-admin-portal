#!/usr/bin/env tsx
/**
 * Analyze Unenriched Products
 *
 * Investigates why 1,063 products remain unenriched by:
 * 1. Querying database for products without enrichment
 * 2. Loading all 188 batch result files
 * 3. Performing name matching analysis (exact, normalized, fuzzy)
 * 4. Identifying mismatch patterns and root causes
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync, writeFileSync } from 'fs';

interface BatchResult {
  productName: string;
  description?: string;
  tastingNotes?: any;
  foodPairings?: string[];
  servingInfo?: any;
  wineDetails?: any;
  metadata?: {
    source?: string;
    confidence?: number;
    researchedAt?: string;
  };
}

interface Product {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  enrichedAt: Date | null;
  tastingNotes: any;
}

interface MatchResult {
  productId: string;
  productName: string;
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'no-match';
  batchNumber?: number;
  batchProductName?: string;
  similarity?: number;
}

class UnenrichedProductAnalyzer {
  private prisma: PrismaClient;
  private batchResults: Map<number, BatchResult[]> = new Map();
  private productNameIndex: Map<string, { batchNumber: number; product: BatchResult }[]> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Normalize product name for matching
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Standardize common variations
      .replace(/\b(md|dc)\b/g, (match) => match.toUpperCase())
      .replace(/kosher/gi, 'Kosher')
      // Remove trailing vintage years in parentheses
      .replace(/\s*\(\d{4}\)\s*$/, '')
      // Normalize punctuation
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/–/g, '-')
      // Remove multiple spaces again
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j - 1] + 1, // substitution
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1      // insertion
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity score (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - (distance / maxLen);
  }

  /**
   * Load all batch result files
   */
  private async loadBatchResults(): Promise<void> {
    console.log('📁 Loading batch result files...');
    const dataDir = resolve(__dirname, '../data');
    const files = readdirSync(dataDir).filter(f =>
      f.startsWith('wine-research-results-batch-') && f.endsWith('.json')
    );

    console.log(`   Found ${files.length} batch result files`);

    for (const file of files) {
      const match = file.match(/batch-(\d+)\.json$/);
      if (!match) continue;

      const batchNumber = parseInt(match[1]);
      const filePath = resolve(dataDir, file);

      try {
        const content = readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);

        // Handle both array format and {wines: [...]} format
        let results: BatchResult[];
        if (Array.isArray(parsed)) {
          results = parsed;
        } else if (parsed.wines && Array.isArray(parsed.wines)) {
          results = parsed.wines;
        } else {
          console.error(`   ⚠️  Unknown format for batch ${batchNumber}`);
          continue;
        }

        this.batchResults.set(batchNumber, results);

        // Build name index
        for (const result of results) {
          const normalized = this.normalizeName(result.productName);

          if (!this.productNameIndex.has(normalized)) {
            this.productNameIndex.set(normalized, []);
          }

          this.productNameIndex.get(normalized)!.push({
            batchNumber,
            product: result
          });
        }
      } catch (error) {
        console.error(`   ⚠️  Failed to load batch ${batchNumber}: ${error}`);
      }
    }

    console.log(`   ✅ Loaded ${this.batchResults.size} batches`);
    console.log(`   ✅ Indexed ${this.productNameIndex.size} unique normalized names`);
  }

  /**
   * Get unenriched products from database
   */
  private async getUnenrichedProducts(): Promise<Product[]> {
    console.log('\n🔍 Querying database for unenriched products...');

    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { enrichedAt: null },
          { tastingNotes: null }
        ]
      },
      select: {
        id: true,
        name: true,
        category: true,
        brand: true,
        enrichedAt: true,
        tastingNotes: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`   Found ${products.length} unenriched products`);
    return products;
  }

  /**
   * Attempt to match a product against batch results
   */
  private findMatch(productName: string): MatchResult | null {
    const normalized = this.normalizeName(productName);

    // Try exact match on normalized name
    const exactMatches = this.productNameIndex.get(normalized);
    if (exactMatches && exactMatches.length > 0) {
      return {
        productId: '',
        productName,
        matchType: 'normalized',
        batchNumber: exactMatches[0].batchNumber,
        batchProductName: exactMatches[0].product.productName,
        similarity: 1.0
      };
    }

    // Try fuzzy matching
    let bestMatch: { batchNumber: number; productName: string; similarity: number } | null = null;

    for (const [indexedName, matches] of this.productNameIndex.entries()) {
      const similarity = this.calculateSimilarity(normalized, indexedName);

      if (similarity >= 0.85 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = {
          batchNumber: matches[0].batchNumber,
          productName: matches[0].product.productName,
          similarity
        };
      }
    }

    if (bestMatch) {
      return {
        productId: '',
        productName,
        matchType: 'fuzzy',
        batchNumber: bestMatch.batchNumber,
        batchProductName: bestMatch.productName,
        similarity: bestMatch.similarity
      };
    }

    return null;
  }

  /**
   * Analyze all unenriched products
   */
  private async analyzeProducts(): Promise<{
    exactMatches: MatchResult[];
    normalizedMatches: MatchResult[];
    fuzzyMatches: MatchResult[];
    noMatches: MatchResult[];
  }> {
    console.log('\n🔬 Analyzing product matches...');

    const products = await this.getUnenrichedProducts();
    const exactMatches: MatchResult[] = [];
    const normalizedMatches: MatchResult[] = [];
    const fuzzyMatches: MatchResult[] = [];
    const noMatches: MatchResult[] = [];

    for (const product of products) {
      const match = this.findMatch(product.name);

      if (!match) {
        noMatches.push({
          productId: product.id,
          productName: product.name,
          matchType: 'no-match'
        });
      } else {
        match.productId = product.id;

        if (match.matchType === 'exact') {
          exactMatches.push(match);
        } else if (match.matchType === 'normalized') {
          normalizedMatches.push(match);
        } else if (match.matchType === 'fuzzy') {
          fuzzyMatches.push(match);
        }
      }
    }

    console.log(`   ✅ Exact matches: ${exactMatches.length}`);
    console.log(`   ✅ Normalized matches: ${normalizedMatches.length}`);
    console.log(`   ✅ Fuzzy matches (>85% similar): ${fuzzyMatches.length}`);
    console.log(`   ❌ No matches: ${noMatches.length}`);

    return { exactMatches, normalizedMatches, fuzzyMatches, noMatches };
  }

  /**
   * Generate comprehensive analysis report
   */
  private async generateReport(analysis: {
    exactMatches: MatchResult[];
    normalizedMatches: MatchResult[];
    fuzzyMatches: MatchResult[];
    noMatches: MatchResult[];
  }): Promise<void> {
    console.log('\n📝 Generating analysis report...');

    const totalUnenriched =
      analysis.exactMatches.length +
      analysis.normalizedMatches.length +
      analysis.fuzzyMatches.length +
      analysis.noMatches.length;

    const totalMatchable =
      analysis.exactMatches.length +
      analysis.normalizedMatches.length +
      analysis.fuzzyMatches.length;

    const report = `# Unenriched Products Analysis Report

**Generated:** ${new Date().toISOString()}

## Executive Summary

- **Total Unenriched Products:** ${totalUnenriched}
- **Total Batch Files:** ${this.batchResults.size}
- **Products in Batch Files:** ${Array.from(this.batchResults.values()).reduce((sum, batch) => sum + batch.length, 0)}

### Match Analysis

| Category | Count | Percentage |
|----------|-------|------------|
| Exact Matches | ${analysis.exactMatches.length} | ${((analysis.exactMatches.length / totalUnenriched) * 100).toFixed(1)}% |
| Normalized Matches | ${analysis.normalizedMatches.length} | ${((analysis.normalizedMatches.length / totalUnenriched) * 100).toFixed(1)}% |
| Fuzzy Matches (>85%) | ${analysis.fuzzyMatches.length} | ${((analysis.fuzzyMatches.length / totalUnenriched) * 100).toFixed(1)}% |
| No Matches | ${analysis.noMatches.length} | ${((analysis.noMatches.length / totalUnenriched) * 100).toFixed(1)}% |
| **Total Matchable** | **${totalMatchable}** | **${((totalMatchable / totalUnenriched) * 100).toFixed(1)}%** |

## Key Findings

### 1. Products That Should Match But Don't (Top 50)

These products have close matches in batch files but weren't applied due to name variations:

${analysis.normalizedMatches.slice(0, 50).map((match, idx) =>
`${idx + 1}. **Database:** \`${match.productName}\`
   **Batch ${match.batchNumber}:** \`${match.batchProductName}\`
   **Similarity:** ${((match.similarity || 1) * 100).toFixed(1)}%
`).join('\n')}

### 2. Fuzzy Match Candidates (Top 50)

These products have high similarity (>85%) but need manual verification:

${analysis.fuzzyMatches.slice(0, 50).map((match, idx) =>
`${idx + 1}. **Database:** \`${match.productName}\`
   **Batch ${match.batchNumber}:** \`${match.batchProductName}\`
   **Similarity:** ${((match.similarity || 0) * 100).toFixed(1)}%
`).join('\n')}

### 3. Products Not in Batch Files

${analysis.noMatches.length} products have no matches in any batch file. Sample:

${analysis.noMatches.slice(0, 30).map((match, idx) =>
`${idx + 1}. \`${match.productName}\``).join('\n')}

## Common Name Mismatch Patterns

Based on the analysis, the following patterns cause matching failures:

1. **Case Sensitivity:** "KOSHER" vs "Kosher", "MD & DC" vs "md & dc"
2. **Whitespace Variations:** Multiple spaces, trailing spaces
3. **Special Characters:** Different apostrophes (' vs '), quotes (" vs "), dashes (– vs -)
4. **Vintage Year Formats:** "(2024)" vs "2024" vs no year
5. **Region Abbreviations:** "MD & DC" vs "Maryland & DC" vs "MD and DC"

## Recommended Name Normalization Rules

\`\`\`typescript
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\\s+/g, ' ')                    // Single spaces
    .replace(/\\b(md|dc)\\b/g, m => m.toUpperCase())  // Standardize regions
    .replace(/kosher/gi, 'Kosher')            // Standardize Kosher
    .replace(/\\s*\\(\\d{4}\\)\\s*$/, '')       // Remove trailing years
    .replace(/['']/g, "'")                     // Normalize apostrophes
    .replace(/[""]/g, '"')                     // Normalize quotes
    .replace(/–/g, '-')                        // Normalize dashes
    .trim();
}
\`\`\`

## Next Steps

### Immediate Actions

1. **Apply Normalized Matches (${analysis.normalizedMatches.length} products)**
   - Run enhanced matcher script with normalization
   - Expected success rate: ~100%

2. **Review Fuzzy Matches (${analysis.fuzzyMatches.length} products)**
   - Manual review of high-confidence matches (>90%)
   - Automated application of very high confidence (>95%)

3. **Handle No Matches (${analysis.noMatches.length} products)**
   - Create new batches for missing products
   - Verify products are still active in catalog

### Long-term Improvements

1. **Update Database Schema**
   - Add normalized_name column for faster matching
   - Add enrichment_status enum field

2. **Improve Batch Processing**
   - Normalize names before creating batches
   - Track which products are in which batches

3. **Implement Fuzzy Matching**
   - Use Levenshtein distance for matching
   - Set confidence thresholds for auto-application

## Detailed Match Data

### All Normalized Matches

<details>
<summary>Click to expand (${analysis.normalizedMatches.length} items)</summary>

${analysis.normalizedMatches.map(match =>
`- **${match.productName}** → Batch ${match.batchNumber}: ${match.batchProductName}`
).join('\n')}

</details>

### All Fuzzy Matches

<details>
<summary>Click to expand (${analysis.fuzzyMatches.length} items)</summary>

${analysis.fuzzyMatches.map(match =>
`- **${match.productName}** → Batch ${match.batchNumber}: ${match.batchProductName} (${((match.similarity || 0) * 100).toFixed(1)}%)`
).join('\n')}

</details>

### All No Matches

<details>
<summary>Click to expand (${analysis.noMatches.length} items)</summary>

${analysis.noMatches.map(match => `- ${match.productName}`).join('\n')}

</details>
`;

    const reportPath = resolve(__dirname, '../docs/unenriched-products-analysis.md');
    writeFileSync(reportPath, report, 'utf-8');
    console.log(`   ✅ Report saved to: ${reportPath}`);

    // Save detailed JSON data
    const dataPath = resolve(__dirname, '../docs/unenriched-products-data.json');
    writeFileSync(dataPath, JSON.stringify(analysis, null, 2), 'utf-8');
    console.log(`   ✅ Data saved to: ${dataPath}`);
  }

  /**
   * Run complete analysis
   */
  async run(): Promise<void> {
    try {
      console.log('🚀 Starting Unenriched Products Analysis\n');
      console.log('='.repeat(60));

      await this.loadBatchResults();
      const analysis = await this.analyzeProducts();
      await this.generateReport(analysis);

      console.log('\n' + '='.repeat(60));
      console.log('✅ Analysis Complete!');
      console.log('\nNext Steps:');
      console.log('1. Review report: docs/unenriched-products-analysis.md');
      console.log('2. Run enhanced matcher: scripts/enhanced-product-matcher.ts');
      console.log('3. Apply fixes: scripts/apply-name-normalization-fixes.sql');

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new UnenrichedProductAnalyzer();
  analyzer.run().catch(console.error);
}

export default UnenrichedProductAnalyzer;
