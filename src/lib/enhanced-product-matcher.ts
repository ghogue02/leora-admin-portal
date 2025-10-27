/**
 * Enhanced Product Matcher
 *
 * Implements 5-tier matching strategy to match database products with enrichment batch files:
 * 1. Exact match (case-insensitive)
 * 2. Normalized match (remove special chars, extra spaces)
 * 3. Fuzzy match (85% similarity threshold)
 * 4. Vintage-agnostic match (remove year numbers)
 * 5. Partial match (key terms only)
 */

export interface MatchResult {
  productId: string;
  productName: string;
  batchFile?: string;
  matchedName?: string;
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'vintage-agnostic' | 'partial' | 'no-match';
  similarityScore: number;
  reason?: string;
}

export interface EnrichedWineData {
  productName: string;
  description: string;
  tastingNotes: {
    aroma: string;
    palate: string;
    finish: string;
  };
  foodPairings: string[];
  servingInfo: {
    temperature: string;
    decanting: string;
    glassware: string;
  };
  wineDetails: {
    region: string;
    grapeVariety: string;
    vintage: string;
    style: string;
    ageability: string;
  };
  metadata: {
    source: string;
    confidence: number;
    researchedAt: string;
  };
}

/**
 * Normalize a string for comparison
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Remove vintage years (4-digit numbers from 1900-2099)
 */
function removeVintage(str: string): string {
  return str.replace(/\b(19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Calculate similarity score using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Extract key terms (brand, varietal, region keywords)
 */
function extractKeyTerms(str: string): string[] {
  const normalized = normalize(str);
  const words = normalized.split(' ');

  // Filter out common stop words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

  return words.filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Calculate partial match score based on key terms
 */
function calculatePartialMatchScore(str1: string, str2: string): number {
  const terms1 = new Set(extractKeyTerms(str1));
  const terms2 = new Set(extractKeyTerms(str2));

  if (terms1.size === 0 || terms2.size === 0) return 0;

  let matches = 0;
  for (const term of terms1) {
    if (terms2.has(term)) {
      matches++;
    }
  }

  return matches / Math.max(terms1.size, terms2.size);
}

/**
 * Match a product name against enriched wines using 5-tier strategy
 */
export function matchProduct(
  productName: string,
  enrichedWines: EnrichedWineData[]
): { wine: EnrichedWineData | null; matchType: string; score: number; reason: string } {
  let bestMatch: EnrichedWineData | null = null;
  let bestScore = 0;
  let matchType = 'no-match';
  let reason = '';

  for (const wine of enrichedWines) {
    // 1. Exact match (case-insensitive)
    if (normalize(productName) === normalize(wine.productName)) {
      return {
        wine,
        matchType: 'exact',
        score: 1.0,
        reason: 'Exact match (case-insensitive)',
      };
    }
  }

  for (const wine of enrichedWines) {
    // 2. Normalized match (remove special chars, extra spaces)
    const normalizedProduct = normalize(productName);
    const normalizedWine = normalize(wine.productName);

    if (normalizedProduct === normalizedWine) {
      return {
        wine,
        matchType: 'normalized',
        score: 0.99,
        reason: 'Normalized match (removed special characters)',
      };
    }
  }

  for (const wine of enrichedWines) {
    // 3. Fuzzy match (85% similarity threshold)
    const similarity = calculateSimilarity(productName, wine.productName);

    if (similarity >= 0.85 && similarity > bestScore) {
      bestMatch = wine;
      bestScore = similarity;
      matchType = 'fuzzy';
      reason = `Fuzzy match (${(similarity * 100).toFixed(1)}% similarity)`;
    }
  }

  if (bestMatch) {
    return { wine: bestMatch, matchType, score: bestScore, reason };
  }

  // 4. Vintage-agnostic match (remove year numbers)
  const productWithoutVintage = removeVintage(productName);

  for (const wine of enrichedWines) {
    const wineWithoutVintage = removeVintage(wine.productName);

    if (normalize(productWithoutVintage) === normalize(wineWithoutVintage)) {
      return {
        wine,
        matchType: 'vintage-agnostic',
        score: 0.95,
        reason: 'Vintage-agnostic match (matched without year)',
      };
    }
  }

  // 5. Partial match (key terms only)
  for (const wine of enrichedWines) {
    const partialScore = calculatePartialMatchScore(productName, wine.productName);

    if (partialScore >= 0.6 && partialScore > bestScore) {
      bestMatch = wine;
      bestScore = partialScore;
      matchType = 'partial';
      reason = `Partial match (${(partialScore * 100).toFixed(1)}% key terms matched)`;
    }
  }

  if (bestMatch) {
    return { wine: bestMatch, matchType, score: bestScore, reason };
  }

  // No match found
  return {
    wine: null,
    matchType: 'no-match',
    score: 0,
    reason: 'No suitable match found with any strategy',
  };
}

/**
 * Find closest matches for unmatched products (for logging purposes)
 */
export function findClosestMatches(
  productName: string,
  enrichedWines: EnrichedWineData[],
  topN: number = 3
): Array<{ wine: EnrichedWineData; score: number }> {
  const scores = enrichedWines.map(wine => ({
    wine,
    score: calculateSimilarity(productName, wine.productName),
  }));

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
