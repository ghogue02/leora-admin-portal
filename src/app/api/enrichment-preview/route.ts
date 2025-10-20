import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export async function GET() {
  try {
    // Read from the generated enrichment JSON file
    const dataPath = resolve(process.cwd(), 'data/enriched-products.json');
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

    // Transform to match expected format
    const products = data.map((item: any, index: number) => ({
      id: item.productId || `product-${index}`,
      name: item.productName,
      brand: item.brand,
      category: item.category,
      description: item.enrichment.description,
      tastingNotes: item.enrichment.tastingNotes,
      foodPairings: item.enrichment.foodPairings,
      servingInfo: item.enrichment.servingInfo,
      wineDetails: item.enrichment.wineDetails,
      enrichedAt: item.generatedAt,
      enrichedBy: item.generatedBy,
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
