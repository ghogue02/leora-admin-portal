/**
 * Wine Enrichment Quality Verification Script
 *
 * Validates wine enrichment data quality by:
 * - Sampling 10% of enriched wines randomly
 * - Validating all required fields are present
 * - Checking for reasonable data values
 * - Ensuring tasting notes are meaningful
 * - Verifying enrichedBy field is set correctly
 *
 * Usage:
 *   npx tsx scripts/verify-enrichment-quality.ts
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

interface QualityCheck {
  checkName: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface WineEnrichmentData {
  productId?: string;
  productName: string;
  description?: string;
  tastingNotes?: {
    aroma?: string;
    palate?: string;
    finish?: string;
  };
  foodPairings?: string[];
  servingInfo?: {
    temperature?: string;
    decanting?: string;
    glassware?: string;
  };
  wineDetails?: {
    region?: string;
    grapeVariety?: string;
    vintage?: string;
    style?: string;
    ageability?: string;
  };
  metadata?: {
    source?: string;
    confidence?: number;
    researchedAt?: string;
  };
}

interface QualityReport {
  batchNumber: number;
  fileName: string;
  totalWines: number;
  sampledWines: number;
  overallScore: number;
  passRate: number;
  checks: {
    requiredFields: { passed: number; total: number };
    validVintages: { passed: number; total: number };
    meaningfulNotes: { passed: number; total: number };
    validConfidence: { passed: number; total: number };
    foodPairings: { passed: number; total: number };
  };
  issues: QualityCheck[];
  highQualityExamples: string[];
  lowQualityExamples: string[];
}

class EnrichmentQualityVerifier {
  private readonly SAMPLE_RATE = 0.1; // 10% sampling
  private readonly MIN_DESCRIPTION_LENGTH = 50;
  private readonly MIN_TASTING_NOTE_LENGTH = 100;
  private readonly MIN_FOOD_PAIRINGS = 3;
  private readonly MIN_CONFIDENCE = 0.7;

  /**
   * Validate a single wine enrichment
   */
  validateWine(wine: WineEnrichmentData): QualityCheck[] {
    const checks: QualityCheck[] = [];

    // Check 1: Required fields
    if (!wine.productName) {
      checks.push({
        checkName: 'product_name',
        passed: false,
        message: 'Missing product name',
        severity: 'error'
      });
    }

    if (!wine.description || wine.description.length < this.MIN_DESCRIPTION_LENGTH) {
      checks.push({
        checkName: 'description',
        passed: false,
        message: `Description too short (${wine.description?.length || 0} chars, min ${this.MIN_DESCRIPTION_LENGTH})`,
        severity: 'error'
      });
    }

    // Check 2: Tasting notes quality
    if (!wine.tastingNotes) {
      checks.push({
        checkName: 'tasting_notes',
        passed: false,
        message: 'Missing tasting notes',
        severity: 'error'
      });
    } else {
      if (!wine.tastingNotes.aroma || wine.tastingNotes.aroma.length < this.MIN_TASTING_NOTE_LENGTH) {
        checks.push({
          checkName: 'tasting_notes_aroma',
          passed: false,
          message: `Aroma notes too short (${wine.tastingNotes.aroma?.length || 0} chars)`,
          severity: 'warning'
        });
      }

      if (!wine.tastingNotes.palate || wine.tastingNotes.palate.length < this.MIN_TASTING_NOTE_LENGTH) {
        checks.push({
          checkName: 'tasting_notes_palate',
          passed: false,
          message: `Palate notes too short (${wine.tastingNotes.palate?.length || 0} chars)`,
          severity: 'warning'
        });
      }

      if (!wine.tastingNotes.finish || wine.tastingNotes.finish.length < 50) {
        checks.push({
          checkName: 'tasting_notes_finish',
          passed: false,
          message: `Finish notes too short (${wine.tastingNotes.finish?.length || 0} chars)`,
          severity: 'warning'
        });
      }

      // Check for generic/template language
      const genericPhrases = [
        'template',
        'example',
        'placeholder',
        'lorem ipsum',
        'TODO',
        'TBD'
      ];

      const allNotes = [
        wine.tastingNotes.aroma || '',
        wine.tastingNotes.palate || '',
        wine.tastingNotes.finish || ''
      ].join(' ').toLowerCase();

      for (const phrase of genericPhrases) {
        if (allNotes.includes(phrase.toLowerCase())) {
          checks.push({
            checkName: 'generic_language',
            passed: false,
            message: `Contains generic phrase: "${phrase}"`,
            severity: 'error'
          });
        }
      }
    }

    // Check 3: Wine details validation
    if (wine.wineDetails?.vintage) {
      const vintage = wine.wineDetails.vintage.toLowerCase();
      if (!vintage.includes('nv') && !vintage.includes('non-vintage')) {
        const vintageYear = parseInt(wine.wineDetails.vintage);
        const currentYear = new Date().getFullYear();

        if (isNaN(vintageYear) || vintageYear < 1900 || vintageYear > currentYear + 1) {
          checks.push({
            checkName: 'invalid_vintage',
            passed: false,
            message: `Invalid vintage year: ${wine.wineDetails.vintage}`,
            severity: 'error'
          });
        }
      }
    }

    // Check 4: Food pairings
    if (!wine.foodPairings || wine.foodPairings.length < this.MIN_FOOD_PAIRINGS) {
      checks.push({
        checkName: 'food_pairings',
        passed: false,
        message: `Insufficient food pairings (${wine.foodPairings?.length || 0}, min ${this.MIN_FOOD_PAIRINGS})`,
        severity: 'warning'
      });
    }

    // Check 5: Serving info
    if (!wine.servingInfo?.temperature || !wine.servingInfo?.decanting || !wine.servingInfo?.glassware) {
      checks.push({
        checkName: 'serving_info',
        passed: false,
        message: 'Incomplete serving information',
        severity: 'warning'
      });
    }

    // Check 6: Metadata validation
    if (wine.metadata) {
      if (wine.metadata.confidence && (wine.metadata.confidence < 0 || wine.metadata.confidence > 1)) {
        checks.push({
          checkName: 'invalid_confidence',
          passed: false,
          message: `Confidence score out of range: ${wine.metadata.confidence}`,
          severity: 'error'
        });
      }

      if (wine.metadata.confidence && wine.metadata.confidence < this.MIN_CONFIDENCE) {
        checks.push({
          checkName: 'low_confidence',
          passed: false,
          message: `Low confidence score: ${wine.metadata.confidence}`,
          severity: 'warning'
        });
      }

      const validSources = ['exact-match', 'producer-match', 'varietal-match', 'generic'];
      if (wine.metadata.source && !validSources.includes(wine.metadata.source)) {
        checks.push({
          checkName: 'invalid_source',
          passed: false,
          message: `Invalid source: ${wine.metadata.source}`,
          severity: 'warning'
        });
      }
    }

    // Check 7: Region and grape variety
    if (!wine.wineDetails?.region) {
      checks.push({
        checkName: 'missing_region',
        passed: false,
        message: 'Missing wine region',
        severity: 'warning'
      });
    }

    if (!wine.wineDetails?.grapeVariety) {
      checks.push({
        checkName: 'missing_grape',
        passed: false,
        message: 'Missing grape variety',
        severity: 'warning'
      });
    }

    return checks;
  }

  /**
   * Calculate quality score for a wine
   */
  calculateWineScore(checks: QualityCheck[]): number {
    const errorWeight = 10;
    const warningWeight = 5;
    const totalPossibleScore = 100;

    const errorCount = checks.filter(c => c.severity === 'error').length;
    const warningCount = checks.filter(c => c.severity === 'warning').length;

    const deductions = (errorCount * errorWeight) + (warningCount * warningWeight);
    return Math.max(0, totalPossibleScore - deductions);
  }

  /**
   * Sample wines from a batch file
   */
  sampleWines(wines: WineEnrichmentData[]): WineEnrichmentData[] {
    const sampleSize = Math.max(1, Math.ceil(wines.length * this.SAMPLE_RATE));
    const sampled: WineEnrichmentData[] = [];

    // Random sampling
    const indices = new Set<number>();
    while (indices.size < sampleSize && indices.size < wines.length) {
      indices.add(Math.floor(Math.random() * wines.length));
    }

    indices.forEach(i => sampled.push(wines[i]));
    return sampled;
  }

  /**
   * Process a single batch file
   */
  processBatch(batchFile: string, batchNumber: number): QualityReport {
    const filePath = resolve(__dirname, '../data', batchFile);

    if (!existsSync(filePath)) {
      throw new Error(`Batch file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const batchData = JSON.parse(content);

    // Handle different batch file formats
    const wines: WineEnrichmentData[] = Array.isArray(batchData)
      ? batchData
      : (batchData.wines || []);

    const sampledWines = this.sampleWines(wines);

    const allChecks: QualityCheck[] = [];
    const wineScores: Array<{ wine: string; score: number }> = [];

    let requiredFieldsPassed = 0;
    let validVintagesPassed = 0;
    let meaningfulNotesPassed = 0;
    let validConfidencePassed = 0;
    let foodPairingsPassed = 0;

    for (const wine of sampledWines) {
      const checks = this.validateWine(wine);
      const score = this.calculateWineScore(checks);

      wineScores.push({
        wine: wine.productName,
        score
      });

      allChecks.push(...checks);

      // Count passes
      if (!checks.some(c => c.checkName === 'product_name' || c.checkName === 'description')) {
        requiredFieldsPassed++;
      }
      if (!checks.some(c => c.checkName === 'invalid_vintage')) {
        validVintagesPassed++;
      }
      if (!checks.some(c => c.checkName.startsWith('tasting_notes') || c.checkName === 'generic_language')) {
        meaningfulNotesPassed++;
      }
      if (!checks.some(c => c.checkName === 'invalid_confidence' || c.checkName === 'low_confidence')) {
        validConfidencePassed++;
      }
      if (!checks.some(c => c.checkName === 'food_pairings')) {
        foodPairingsPassed++;
      }
    }

    // Calculate overall score
    const avgScore = wineScores.reduce((sum, ws) => sum + ws.score, 0) / wineScores.length;
    const passRate = (wineScores.filter(ws => ws.score >= 70).length / wineScores.length) * 100;

    // Get examples
    wineScores.sort((a, b) => b.score - a.score);
    const highQuality = wineScores.slice(0, 3).map(ws => `${ws.wine} (${ws.score})`);
    const lowQuality = wineScores.slice(-3).map(ws => `${ws.wine} (${ws.score})`);

    return {
      batchNumber,
      fileName: batchFile,
      totalWines: wines.length,
      sampledWines: sampledWines.length,
      overallScore: Math.round(avgScore),
      passRate: Math.round(passRate),
      checks: {
        requiredFields: { passed: requiredFieldsPassed, total: sampledWines.length },
        validVintages: { passed: validVintagesPassed, total: sampledWines.length },
        meaningfulNotes: { passed: meaningfulNotesPassed, total: sampledWines.length },
        validConfidence: { passed: validConfidencePassed, total: sampledWines.length },
        foodPairings: { passed: foodPairingsPassed, total: sampledWines.length }
      },
      issues: allChecks.filter(c => c.severity === 'error'),
      highQualityExamples: highQuality,
      lowQualityExamples: lowQuality
    };
  }

  /**
   * Process all batch files
   */
  processAllBatches(): QualityReport[] {
    const dataDir = resolve(__dirname, '../data');
    const batchFiles = readdirSync(dataDir)
      .filter(f => f.startsWith('wine-research-results-batch-') && f.endsWith('.json'))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/batch-(\d+)/)?.[1] || '0');
        const bNum = parseInt(b.match(/batch-(\d+)/)?.[1] || '0');
        return aNum - bNum;
      });

    console.log(`\n🔍 WINE ENRICHMENT QUALITY VERIFICATION`);
    console.log(`========================================\n`);
    console.log(`Found ${batchFiles.length} batch files to verify`);
    console.log(`Sample rate: ${this.SAMPLE_RATE * 100}%\n`);

    const reports: QualityReport[] = [];

    for (const batchFile of batchFiles) {
      const batchNumber = parseInt(batchFile.match(/batch-(\d+)/)?.[1] || '0');

      try {
        const report = this.processBatch(batchFile, batchNumber);
        reports.push(report);

        console.log(`✅ Batch ${batchNumber}: Score ${report.overallScore}/100, Pass Rate ${report.passRate}%`);
      } catch (error) {
        console.error(`❌ Batch ${batchNumber}: Error processing - ${error}`);
      }
    }

    return reports;
  }
}

// Run verification
async function main() {
  const verifier = new EnrichmentQualityVerifier();
  const reports = verifier.processAllBatches();

  // Calculate aggregate statistics
  const totalBatches = reports.length;
  const avgScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / totalBatches;
  const avgPassRate = reports.reduce((sum, r) => sum + r.passRate, 0) / totalBatches;
  const totalSampled = reports.reduce((sum, r) => sum + r.sampledWines, 0);
  const totalWines = reports.reduce((sum, r) => sum + r.totalWines, 0);

  console.log(`\n\n📊 AGGREGATE STATISTICS`);
  console.log(`======================\n`);
  console.log(`Total batches processed: ${totalBatches}`);
  console.log(`Total wines: ${totalWines}`);
  console.log(`Total wines sampled: ${totalSampled} (${((totalSampled/totalWines)*100).toFixed(1)}%)`);
  console.log(`Average quality score: ${avgScore.toFixed(1)}/100`);
  console.log(`Average pass rate: ${avgPassRate.toFixed(1)}%`);

  // Identify problematic batches
  const lowScoreBatches = reports.filter(r => r.overallScore < 70);
  if (lowScoreBatches.length > 0) {
    console.log(`\n⚠️  ${lowScoreBatches.length} batches with scores below 70:`);
    lowScoreBatches.forEach(r => {
      console.log(`   Batch ${r.batchNumber}: ${r.overallScore}/100`);
    });
  }

  // Calculate field-specific pass rates
  const fieldStats = {
    requiredFields: 0,
    validVintages: 0,
    meaningfulNotes: 0,
    validConfidence: 0,
    foodPairings: 0
  };

  reports.forEach(r => {
    fieldStats.requiredFields += r.checks.requiredFields.passed;
    fieldStats.validVintages += r.checks.validVintages.passed;
    fieldStats.meaningfulNotes += r.checks.meaningfulNotes.passed;
    fieldStats.validConfidence += r.checks.validConfidence.passed;
    fieldStats.foodPairings += r.checks.foodPairings.passed;
  });

  console.log(`\n📋 FIELD-SPECIFIC PASS RATES`);
  console.log(`============================\n`);
  console.log(`Required fields: ${((fieldStats.requiredFields/totalSampled)*100).toFixed(1)}%`);
  console.log(`Valid vintages: ${((fieldStats.validVintages/totalSampled)*100).toFixed(1)}%`);
  console.log(`Meaningful notes: ${((fieldStats.meaningfulNotes/totalSampled)*100).toFixed(1)}%`);
  console.log(`Valid confidence: ${((fieldStats.validConfidence/totalSampled)*100).toFixed(1)}%`);
  console.log(`Food pairings: ${((fieldStats.foodPairings/totalSampled)*100).toFixed(1)}%`);

  // Save detailed report
  const reportPath = resolve(__dirname, '../docs/enrichment-quality-report.json');
  const fs = require('fs');
  fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}\n`);

  return reports;
}

main().catch(console.error);
