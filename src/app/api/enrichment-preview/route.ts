import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { resolve } from 'path';

type EnrichmentDetails = {
  description?: string;
  tastingNotes?: string[];
  foodPairings?: string[];
  servingInfo?: string;
  wineDetails?: Record<string, unknown>;
};

type EnrichedProductRecord = {
  productId?: string;
  productName: string;
  brand?: string;
  category?: string;
  enrichment: EnrichmentDetails;
  generatedAt?: string;
  generatedBy?: string;
};

export async function GET() {
  try {
    // Read from the generated enrichment JSON file
    const dataPath = resolve(process.cwd(), 'data/enriched-products.json');
    const data = JSON.parse(readFileSync(dataPath, 'utf-8')) as EnrichedProductRecord[];

    // Transform to match expected format
    const products = data.map((item, index) => ({
      id: item.productId || `product-${index}`,
      name: item.productName,
      brand: item.brand,
      category: item.category,
      description: item.enrichment?.description ?? null,
      tastingNotes: item.enrichment?.tastingNotes ?? [],
      foodPairings: item.enrichment?.foodPairings ?? [],
      servingInfo: item.enrichment?.servingInfo ?? null,
      wineDetails: item.enrichment?.wineDetails ?? null,
      enrichedAt: item.generatedAt ?? null,
      enrichedBy: item.generatedBy ?? null,
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error loading enrichment data:', error);
    return NextResponse.json(
      { error: 'Failed to load enrichment data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
