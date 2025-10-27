/**
 * Context builder for AI product recommendations
 * Fetches and analyzes customer data to build recommendation context
 */

import { createClient } from '@/lib/supabase/server';
import { Order, SampleUsage, RecommendationContext } from './ai-recommendations';

export interface CustomerPreferences {
  categories: string[];
  varietals: string[];
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
}

/**
 * Build complete context for AI recommendations
 */
export async function buildCustomerContext(
  customerId: string,
  options: {
    includeOrders?: boolean;
    includeSamples?: boolean;
    orderLimit?: number;
    sampleLimit?: number;
  } = {}
): Promise<RecommendationContext> {
  const {
    includeOrders = true,
    includeSamples = true,
    orderLimit = 10,
    sampleLimit = 20,
  } = options;

  const supabase = await createClient();

  // Fetch customer data
  const { data: customer } = await supabase
    .from('customers')
    .select('notes')
    .eq('id', customerId)
    .single();

  const context: RecommendationContext = {
    customerNotes: customer?.notes || undefined,
  };

  // Fetch order history if requested
  if (includeOrders) {
    context.previousOrders = await getRecentOrders(customerId, orderLimit);
  }

  // Fetch sample history if requested
  if (includeSamples) {
    context.sampleHistory = await getSampleHistory(customerId, sampleLimit);
  }

  // Analyze preferences from orders and samples
  const preferences = await getCustomerPreferences(customerId);
  context.pricePreference = preferences.priceRange;
  context.productPreferences = {
    categories: preferences.categories,
    varietals: preferences.varietals,
  };

  return context;
}

/**
 * Get customer's recent orders with items
 */
export async function getRecentOrders(customerId: string, limit: number = 10): Promise<Order[]> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      created_at,
      total,
      order_items (
        product_id,
        quantity,
        price,
        products (
          name
        )
      )
    `
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  if (!orders) return [];

  return orders.map(order => ({
    id: order.id,
    createdAt: new Date(order.created_at),
    total: order.total || 0,
    items: (order.order_items || []).map((item: any) => ({
      productId: item.product_id,
      productName: item.products?.name || 'Unknown Product',
      quantity: item.quantity,
      price: item.price,
    })),
  }));
}

/**
 * Get customer's sample usage history
 */
export async function getSampleHistory(
  customerId: string,
  limit: number = 20
): Promise<SampleUsage[]> {
  const supabase = await createClient();

  const { data: samples, error } = await supabase
    .from('sample_usage')
    .select(
      `
      id,
      product_id,
      used_at,
      feedback,
      notes,
      products (
        name
      )
    `
    )
    .eq('customer_id', customerId)
    .order('used_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching sample history:', error);
    return [];
  }

  if (!samples) return [];

  return samples.map(sample => ({
    id: sample.id,
    productId: sample.product_id,
    productName: sample.products?.name || 'Unknown Product',
    usedAt: new Date(sample.used_at),
    feedback: sample.feedback as 'positive' | 'negative' | 'neutral' | undefined,
    notes: sample.notes || undefined,
  }));
}

/**
 * Analyze customer preferences from order and sample history
 */
export async function getCustomerPreferences(
  customerId: string
): Promise<CustomerPreferences> {
  const supabase = await createClient();

  // Get product data from orders
  const { data: orderItems } = await supabase
    .from('order_items')
    .select(
      `
      price,
      products (
        category,
        varietal
      )
    `
    )
    .in(
      'order_id',
      supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerId)
    );

  const preferences: CustomerPreferences = {
    categories: [],
    varietals: [],
    priceRange: {
      min: 0,
      max: 0,
      average: 0,
    },
  };

  if (!orderItems || orderItems.length === 0) {
    return preferences;
  }

  // Extract categories and varietals
  const categorySet = new Set<string>();
  const varietalSet = new Set<string>();
  const prices: number[] = [];

  orderItems.forEach((item: any) => {
    if (item.products?.category) {
      categorySet.add(item.products.category);
    }
    if (item.products?.varietal) {
      varietalSet.add(item.products.varietal);
    }
    if (item.price) {
      prices.push(item.price);
    }
  });

  preferences.categories = Array.from(categorySet);
  preferences.varietals = Array.from(varietalSet);

  // Calculate price range
  if (prices.length > 0) {
    preferences.priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    };
  }

  return preferences;
}

/**
 * Get available products for recommendations
 */
export async function getAvailableProducts(options: {
  limit?: number;
  excludeProductIds?: string[];
  categories?: string[];
  priceRange?: { min: number; max: number };
} = {}): Promise<{ id: string; name: string; category: string; price: number }[]> {
  const { limit = 100, excludeProductIds = [], categories, priceRange } = options;

  const supabase = await createClient();

  let query = supabase
    .from('products')
    .select('id, name, category, price')
    .eq('status', 'active')
    .order('name');

  // Filter by categories if provided
  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

  // Filter by price range if provided
  if (priceRange) {
    query = query.gte('price', priceRange.min).lte('price', priceRange.max);
  }

  // Exclude specific products
  if (excludeProductIds.length > 0) {
    query = query.not('id', 'in', `(${excludeProductIds.join(',')})`);
  }

  query = query.limit(limit);

  const { data: products, error } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return products || [];
}

/**
 * Get recently ordered product IDs to potentially exclude from recommendations
 */
export async function getRecentlyOrderedProductIds(
  customerId: string,
  daysBack: number = 30
): Promise<string[]> {
  const supabase = await createClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id')
    .in(
      'order_id',
      supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerId)
        .gte('created_at', cutoffDate.toISOString())
    );

  if (!orderItems) return [];

  // Return unique product IDs
  return [...new Set(orderItems.map((item: any) => item.product_id))];
}
