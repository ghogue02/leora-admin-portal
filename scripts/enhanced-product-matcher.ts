#!/usr/bin/env tsx
/**
 * Enhanced Product Matcher
 *
 * Applies enrichment data to unenriched products using:
 * - Name normalization for common variations
 * - Fuzzy matching with Levenshtein distance
 * - Confidence scoring and logging
 * - Dry-run mode for safety
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';

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

interface MatchAttempt {
  productId: string;
  productName: string;
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'failed';
  batchNumber?: number;
  batchProductName?: string;
  similarity?: number;
  applied: boolean;
  error?: string;
}

class EnhancedProductMatcher {
  private prisma: PrismaClient;
  private dryRun: boolean;
  private minFuzzySimilarity: number;
  private matchLog: MatchAttempt[] = [];
  private batchResults: Map<number, BatchResult[]> = new Map();
  private productNameIndex: Map<string, { batchNumber: number; product: BatchResult }[]> = new Map();

  constructor(options: {
    dryRun?: boolean;
    minFuzzySimilarity?: number;
  } = {}) {
    this.prisma = new PrismaClient();
    this.dryRun = options.dryRun ?? true;
    this.minFuzzySimilarity = options.minFuzzySimilarity ?? 0.90;

    console.log(`🔧 Configuration:`);
    console.log(`   Dry Run: ${this.dryRun ? 'YES (no changes will be made)' : 'NO (LIVE MODE)'}`);
    console.log(`   Min Fuzzy Similarity: ${(this.minFuzzySimilarity * 100).toFixed(0)}%`);
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
      // Remove "the" at the beginning
      .replace(/^the\s+/i, '')
      // Standardize "&" and "and"
      .replace(/\s+&\s+/g, ' and ')
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
   * Load all batch result files and build index
   */
  private async loadBatchResults(): Promise<void> {
    console.log('\n📁 Loading batch result files...');
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

        // Build normalized name index
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
   * Find best match for a product name
   */
  private findBestMatch(productName: string): {
    batchNumber: number;
    product: BatchResult;
    matchType: 'exact' | 'normalized' | 'fuzzy';
    similarity: number;
  } | null {
    const normalized = this.normalizeName(productName);

    // Try exact match on normalized name
    const exactMatches = this.productNameIndex.get(normalized);
    if (exactMatches && exactMatches.length > 0) {
      return {
        batchNumber: exactMatches[0].batchNumber,
        product: exactMatches[0].product,
        matchType: 'normalized',
        similarity: 1.0
      };
    }

    // Try fuzzy matching
    let bestMatch: {
      batchNumber: number;
      product: BatchResult;
      similarity: number;
    } | null = null;

    for (const [indexedName, matches] of this.productNameIndex.entries()) {
      const similarity = this.calculateSimilarity(normalized, indexedName);

      if (similarity >= this.minFuzzySimilarity && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = {
          batchNumber: matches[0].batchNumber,
          product: matches[0].product,
          similarity
        };
      }
    }

    if (bestMatch) {
      return {
        ...bestMatch,
        matchType: 'fuzzy'
      };
    }

    return null;
  }

  /**
   * Apply enrichment data to a product
   */
  private async applyEnrichment(
    productId: string,
    productName: string,
    enrichmentData: BatchResult,
    batchNumber: number
  ): Promise<boolean> {
    if (this.dryRun) {
      console.log(`   [DRY RUN] Would update product ${productName}`);
      return true;
    }

    try {
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          description: enrichmentData.description,
          tastingNotes: enrichmentData.tastingNotes as any,
          foodPairings: enrichmentData.foodPairings as any,
          servingInfo: enrichmentData.servingInfo as any,
          wineDetails: enrichmentData.wineDetails as any,
          enrichedAt: new Date(),
          enrichedBy: `claude-ai-batch-${batchNumber}-enhanced`
        }
      });

      return true;
    } catch (error) {
      console.error(`   ❌ Failed to update product ${productName}: ${error}`);
      return false;
    }
  }

  /**
   * Process all unenriched products
   */
  private async processProducts(): Promise<void> {
    console.log('\n🔬 Processing unenriched products...');

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
        brand: true,
        category: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`   Found ${products.length} unenriched products\n`);

    let processed = 0;
    let matched = 0;
    let applied = 0;
    let failed = 0;

    for (const product of products) {
      processed++;

      if (processed % 100 === 0) {
        console.log(`   Progress: ${processed}/${products.length} (${matched} matched, ${applied} applied)`);
      }

      const match = this.findBestMatch(product.name);

      if (!match) {
        this.matchLog.push({
          productId: product.id,
          productName: product.name,
          matchType: 'failed',
          applied: false
        });
        failed++;
        continue;
      }

      matched++;

      const success = await this.applyEnrichment(
        product.id,
        product.name,
        match.product,
        match.batchNumber
      );

      this.matchLog.push({
        productId: product.id,
        productName: product.name,
        matchType: match.matchType,
        batchNumber: match.batchNumber,
        batchProductName: match.product.productName,
        similarity: match.similarity,
        applied: success
      });

      if (success) {
        applied++;
      }
    }

    console.log(`\n✅ Processing Complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Matched: ${matched} (${((matched / processed) * 100).toFixed(1)}%)`);
    console.log(`   Applied: ${applied}`);
    console.log(`   Failed: ${failed}`);
  }

  /**
   * Generate match log report
   */
  private saveMatchLog(): void {
    console.log('\n📝 Saving match log...');

    const logsDir = resolve(__dirname, '../data/logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = resolve(logsDir, `enhanced-matcher-log-${timestamp}.json`);

    const summary = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      minFuzzySimilarity: this.minFuzzySimilarity,
      statistics: {
        total: this.matchLog.length,
        normalized: this.matchLog.filter(m => m.matchType === 'normalized').length,
        fuzzy: this.matchLog.filter(m => m.matchType === 'fuzzy').length,
        failed: this.matchLog.filter(m => m.matchType === 'failed').length,
        applied: this.matchLog.filter(m => m.applied).length
      },
      matches: this.matchLog
    };

    writeFileSync(logPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`   ✅ Log saved to: ${logPath}`);

    // Also save a markdown summary
    const mdPath = resolve(logsDir, `enhanced-matcher-summary-${timestamp}.md`);
    const mdContent = this.generateMarkdownSummary(summary);
    writeFileSync(mdPath, mdContent, 'utf-8');
    console.log(`   ✅ Summary saved to: ${mdPath}`);
  }

  /**
   * Generate markdown summary
   */
  private generateMarkdownSummary(summary: any): string {
    return `# Enhanced Product Matcher - Run Summary

**Date:** ${summary.timestamp}
**Mode:** ${summary.dryRun ? 'DRY RUN' : 'LIVE'}
**Min Similarity:** ${(summary.minFuzzySimilarity * 100).toFixed(0)}%

## Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Products | ${summary.statistics.total} | 100% |
| Normalized Matches | ${summary.statistics.normalized} | ${((summary.statistics.normalized / summary.statistics.total) * 100).toFixed(1)}% |
| Fuzzy Matches | ${summary.statistics.fuzzy} | ${((summary.statistics.fuzzy / summary.statistics.total) * 100).toFixed(1)}% |
| Failed Matches | ${summary.statistics.failed} | ${((summary.statistics.failed / summary.statistics.total) * 100).toFixed(1)}% |
| Successfully Applied | ${summary.statistics.applied} | ${((summary.statistics.applied / summary.statistics.total) * 100).toFixed(1)}% |

## Match Type Breakdown

### Normalized Matches (${summary.statistics.normalized})
Products matched using name normalization rules.

### Fuzzy Matches (${summary.statistics.fuzzy})
Products matched using similarity scoring (>=${(summary.minFuzzySimilarity * 100).toFixed(0)}%).

### Failed Matches (${summary.statistics.failed})
Products with no suitable match found.

## Top 20 Failed Matches

${this.matchLog
  .filter(m => m.matchType === 'failed')
  .slice(0, 20)
  .map((m, idx) => `${idx + 1}. ${m.productName}`)
  .join('\n')}

## See Full Details

Full match log: \`${summary.timestamp.replace(/[:.]/g, '-')}.json\`
`;
  }

  /**
   * Run the enhanced matcher
   */
  async run(): Promise<void> {
    try {
      console.log('🚀 Enhanced Product Matcher');
      console.log('='.repeat(60));

      await this.loadBatchResults();
      await this.processProducts();
      this.saveMatchLog();

      console.log('\n' + '='.repeat(60));
      console.log('✅ Matching Complete!');

      if (this.dryRun) {
        console.log('\n⚠️  DRY RUN MODE - No changes were made to database');
        console.log('   To apply changes, run with --live flag');
      }

    } catch (error) {
      console.error('❌ Matching failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');
  const minSimilarity = args.includes('--min-similarity')
    ? parseFloat(args[args.indexOf('--min-similarity') + 1])
    : 0.90;

  const matcher = new EnhancedProductMatcher({
    dryRun,
    minFuzzySimilarity: minSimilarity
  });

  matcher.run().catch(console.error);
}

export default EnhancedProductMatcher;
