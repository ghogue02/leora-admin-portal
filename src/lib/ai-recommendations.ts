/**
 * AI-powered product recommendations using Claude's tool calling
 * Uses structured tool responses to return specific product IDs
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface Order {
  id: string;
  createdAt: Date;
  total: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
}

export interface SampleUsage {
  id: string;
  productId: string;
  productName: string;
  usedAt: Date;
  feedback?: 'positive' | 'negative' | 'neutral';
  notes?: string;
}

export interface RecommendationContext {
  previousOrders?: Order[];
  sampleHistory?: SampleUsage[];
  customerNotes?: string;
  occasion?: string;
  pricePreference?: {
    min: number;
    max: number;
    average: number;
  };
  productPreferences?: {
    categories: string[];
    varietals: string[];
  };
}

export interface ProductRecommendation {
  productId: string;
  reason: string;
  confidence: number;
}

interface RecommendToolInput {
  recommendations: ProductRecommendation[];
}

/**
 * Get AI-powered product recommendations using Claude
 */
export async function getProductRecommendations(
  customerId: string,
  context: RecommendationContext,
  availableProducts: { id: string; name: string; category: string; price: number }[],
  options: {
    maxRecommendations?: number;
    minConfidence?: number;
  } = {}
): Promise<ProductRecommendation[]> {
  const { maxRecommendations = 5, minConfidence = 0.6 } = options;

  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  // Define the tool for Claude to return structured product recommendations
  const tools: Anthropic.Tool[] = [
    {
      name: 'recommend_products',
      description: `Recommend specific products by ID from the catalog. Return up to ${maxRecommendations} recommendations with reasoning and confidence scores.`,
      input_schema: {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            description: 'List of product recommendations',
            items: {
              type: 'object',
              properties: {
                productId: {
                  type: 'string',
                  description: 'Product UUID from the available catalog',
                },
                reason: {
                  type: 'string',
                  description: 'Clear explanation of why this product is recommended',
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence score between 0 and 1',
                  minimum: 0,
                  maximum: 1,
                },
              },
              required: ['productId', 'reason', 'confidence'],
            },
          },
        },
        required: ['recommendations'],
      },
    },
  ];

  // Build the system prompt
  const systemPrompt = buildSystemPrompt();

  // Build the user message with context
  const userMessage = buildUserMessage(customerId, context, availableProducts, maxRecommendations);

  try {
    // Call Claude with tool use capability
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      tools,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      system: systemPrompt,
    });

    // Extract tool use from response
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUseBlock && toolUseBlock.name === 'recommend_products') {
      const input = toolUseBlock.input as RecommendToolInput;

      // Filter by minimum confidence and validate product IDs
      const validRecommendations = input.recommendations.filter(rec => {
        const isValidProduct = availableProducts.some(p => p.id === rec.productId);
        const meetsConfidence = rec.confidence >= minConfidence;
        return isValidProduct && meetsConfidence;
      });

      return validRecommendations.slice(0, maxRecommendations);
    }

    // If no tool use found, return empty array
    return [];
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    throw new Error(
      `Failed to get AI recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build the system prompt for Claude
 */
function buildSystemPrompt(): string {
  return `You are an expert wine sommelier and sales assistant for Well Crafted Wine & Beverage Co.

Your task is to recommend products that match the customer's preferences and needs.

Consider these factors when making recommendations:
- Previous order history: What products have they purchased before? What patterns do you see?
- Sample history: What products have they tasted? What was their feedback?
- Customer notes and preferences: Any specific likes, dislikes, or requirements?
- Occasion or context: Is this for a wine pairing, new menu, seasonal offering, or general stock?
- Price points: What price range does this customer typically order in?
- Product variety: Don't just recommend the same types - suggest complementary options
- Seasonal appropriateness: Consider if products fit the current season
- Inventory balance: Help them discover both popular items and hidden gems

Guidelines:
- Recommend products they haven't tried recently (encourage discovery)
- Match their established preferences while introducing variety
- Provide clear, compelling reasons for each recommendation
- Be honest about confidence - only high-confidence recommendations are valuable
- Consider the occasion and context when provided
- Think like a sommelier helping a valued client grow their business

Use the recommend_products tool to return specific product IDs with reasoning and confidence scores (0-1).`;
}

/**
 * Build the user message with all context
 */
function buildUserMessage(
  customerId: string,
  context: RecommendationContext,
  availableProducts: { id: string; name: string; category: string; price: number }[],
  maxRecommendations: number
): string {
  const parts: string[] = [];

  parts.push(`Customer ID: ${customerId}\n`);

  // Add occasion/context
  if (context.occasion) {
    parts.push(`Context: ${context.occasion}\n`);
  }

  // Add customer notes
  if (context.customerNotes) {
    parts.push(`Customer Notes: ${context.customerNotes}\n`);
  }

  // Add price preferences
  if (context.pricePreference) {
    parts.push(
      `Price Range: $${context.pricePreference.min}-$${context.pricePreference.max} (avg: $${context.pricePreference.average})\n`
    );
  }

  // Add product preferences
  if (context.productPreferences) {
    if (context.productPreferences.categories.length > 0) {
      parts.push(`Preferred Categories: ${context.productPreferences.categories.join(', ')}\n`);
    }
    if (context.productPreferences.varietals.length > 0) {
      parts.push(`Preferred Varietals: ${context.productPreferences.varietals.join(', ')}\n`);
    }
  }

  // Add order history
  if (context.previousOrders && context.previousOrders.length > 0) {
    parts.push(`\nPrevious Orders (${context.previousOrders.length} recent):`);
    context.previousOrders.forEach(order => {
      parts.push(`\n- Order ${order.id} (${order.createdAt.toLocaleDateString()}): $${order.total}`);
      order.items.forEach(item => {
        parts.push(`  * ${item.productName} (x${item.quantity}) @ $${item.price}`);
      });
    });
    parts.push('\n');
  }

  // Add sample history
  if (context.sampleHistory && context.sampleHistory.length > 0) {
    parts.push(`\nSample History (${context.sampleHistory.length} samples):`);
    context.sampleHistory.forEach(sample => {
      const feedbackIcon = sample.feedback === 'positive' ? '✓' : sample.feedback === 'negative' ? '✗' : '○';
      parts.push(
        `\n- ${feedbackIcon} ${sample.productName} (${sample.usedAt.toLocaleDateString()})`
      );
      if (sample.notes) {
        parts.push(`  Note: ${sample.notes}`);
      }
    });
    parts.push('\n');
  }

  // Add available products catalog
  parts.push(`\nAvailable Products (${availableProducts.length} total):`);
  parts.push('\nID | Name | Category | Price');
  parts.push('---|------|----------|------');
  availableProducts.forEach(product => {
    parts.push(`${product.id} | ${product.name} | ${product.category} | $${product.price}`);
  });

  parts.push(
    `\n\nPlease recommend up to ${maxRecommendations} products for this customer using the recommend_products tool. Provide specific product IDs from the catalog above, along with your reasoning and confidence level.`
  );

  return parts.join('\n');
}

/**
 * Test function to validate tool calling without hitting API
 * Useful for development and testing
 */
export function buildRecommendationPrompt(
  customerId: string,
  context: RecommendationContext,
  availableProducts: { id: string; name: string; category: string; price: number }[],
  maxRecommendations: number = 5
): { system: string; user: string } {
  return {
    system: buildSystemPrompt(),
    user: buildUserMessage(customerId, context, availableProducts, maxRecommendations),
  };
}
