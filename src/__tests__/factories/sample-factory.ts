/**
 * Test Data Factories for Samples
 *
 * Factory functions to create test data for sample-related tests.
 * Use these instead of manually creating test objects.
 */

import { faker } from '@faker-js/faker';

export interface TestSampleUsage {
  id: string;
  customerId: string;
  productId: string;
  salesRepId: string;
  dateGiven: Date;
  quantity: number;
  feedback?: string;
  resultedInOrder: boolean;
  orderId?: string;
  productName?: string;
  customerName?: string;
  salesRepName?: string;
  createdAt: Date;
}

export interface TestSampleMetrics {
  totalSamples: number;
  totalValue: number;
  conversionRate: number;
  avgTimeToConversion: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSamples: number;
    conversions: number;
    conversionRate: number;
  }>;
}

export interface TestAutomatedTrigger {
  id: string;
  name: string;
  description?: string;
  triggerType: 'sample_no_order' | 'first_order_followup' | 'customer_timing' | 'burn_rate_alert';
  conditions: Record<string, any>;
  actionType: 'create_task' | 'send_notification' | 'update_record';
  actionPayload: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

export interface TestSampleFeedbackTemplate {
  id: string;
  name: string;
  template: string;
  category: 'positive' | 'neutral' | 'negative' | 'question';
  isActive: boolean;
}

/**
 * Create test sample with optional overrides
 */
export function createTestSample(overrides?: Partial<TestSampleUsage>): TestSampleUsage {
  const baseDate = faker.date.recent({ days: 30 });

  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    productId: faker.string.uuid(),
    salesRepId: faker.string.uuid(),
    dateGiven: baseDate,
    quantity: faker.number.int({ min: 1, max: 5 }),
    feedback: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
    resultedInOrder: faker.datatype.boolean(),
    orderId: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.3 }),
    productName: faker.commerce.productName(),
    customerName: faker.company.name(),
    salesRepName: faker.person.fullName(),
    createdAt: baseDate,
    ...overrides,
  };
}

/**
 * Create multiple test samples
 */
export function createTestSamples(count: number, overrides?: Partial<TestSampleUsage>): TestSampleUsage[] {
  return Array.from({ length: count }, () => createTestSample(overrides));
}

/**
 * Create test sample that resulted in order
 */
export function createConvertedSample(overrides?: Partial<TestSampleUsage>): TestSampleUsage {
  return createTestSample({
    resultedInOrder: true,
    orderId: faker.string.uuid(),
    ...overrides,
  });
}

/**
 * Create test sample with no order yet
 */
export function createPendingSample(overrides?: Partial<TestSampleUsage>): TestSampleUsage {
  return createTestSample({
    resultedInOrder: false,
    orderId: undefined,
    ...overrides,
  });
}

/**
 * Create test sample metrics
 */
export function createTestMetrics(overrides?: Partial<TestSampleMetrics>): TestSampleMetrics {
  const totalSamples = faker.number.int({ min: 50, max: 500 });
  const conversions = faker.number.int({ min: 10, max: totalSamples });

  return {
    totalSamples,
    totalValue: faker.number.float({ min: 1000, max: 50000, precision: 0.01 }),
    conversionRate: conversions / totalSamples,
    avgTimeToConversion: faker.number.float({ min: 1, max: 30, precision: 0.1 }),
    topProducts: Array.from({ length: 5 }, () => {
      const samples = faker.number.int({ min: 10, max: 100 });
      const productConversions = faker.number.int({ min: 0, max: samples });
      return {
        productId: faker.string.uuid(),
        productName: faker.commerce.productName(),
        totalSamples: samples,
        conversions: productConversions,
        conversionRate: productConversions / samples,
      };
    }),
    ...overrides,
  };
}

/**
 * Create test automated trigger
 */
export function createTestTrigger(overrides?: Partial<TestAutomatedTrigger>): TestAutomatedTrigger {
  const triggerType = faker.helpers.arrayElement([
    'sample_no_order',
    'first_order_followup',
    'customer_timing',
    'burn_rate_alert',
  ] as const);

  const conditions = {
    sample_no_order: { daysAfterSample: 7 },
    first_order_followup: { daysAfterOrder: 3 },
    customer_timing: { daysSinceLastContact: 14 },
    burn_rate_alert: { thresholdDays: 30 },
  };

  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    triggerType,
    conditions: conditions[triggerType],
    actionType: 'create_task',
    actionPayload: {
      title: faker.lorem.words(5),
      description: faker.lorem.sentence(),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
    },
    isActive: faker.datatype.boolean(),
    createdAt: faker.date.recent({ days: 60 }),
    ...overrides,
  };
}

/**
 * Create test feedback template
 */
export function createTestFeedbackTemplate(overrides?: Partial<TestSampleFeedbackTemplate>): TestSampleFeedbackTemplate {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(2),
    template: faker.lorem.sentence(),
    category: faker.helpers.arrayElement(['positive', 'neutral', 'negative', 'question']),
    isActive: true,
    ...overrides,
  };
}

/**
 * Create test customer order for conversion tracking
 */
export interface TestCustomerOrder {
  id: string;
  customerId: string;
  orderDate: Date;
  totalValue: number;
  status: 'pending' | 'completed' | 'cancelled';
}

export function createTestOrder(overrides?: Partial<TestCustomerOrder>): TestCustomerOrder {
  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    orderDate: faker.date.recent({ days: 30 }),
    totalValue: faker.number.float({ min: 100, max: 10000, precision: 0.01 }),
    status: faker.helpers.arrayElement(['pending', 'completed', 'cancelled']),
    ...overrides,
  };
}

/**
 * Create a complete sample scenario (sample + potential order)
 */
export interface SampleScenario {
  sample: TestSampleUsage;
  order?: TestCustomerOrder;
  withinConversionWindow: boolean;
}

export function createSampleScenario(config?: {
  shouldConvert?: boolean;
  daysUntilOrder?: number;
  orderStatus?: 'pending' | 'completed' | 'cancelled';
}): SampleScenario {
  const shouldConvert = config?.shouldConvert ?? faker.datatype.boolean();
  const daysUntilOrder = config?.daysUntilOrder ?? faker.number.int({ min: 1, max: 35 });
  const withinConversionWindow = daysUntilOrder <= 30;

  const sampleDate = faker.date.recent({ days: 40 });
  const sample = createTestSample({
    dateGiven: sampleDate,
    resultedInOrder: shouldConvert && withinConversionWindow,
  });

  let order: TestCustomerOrder | undefined;
  if (shouldConvert) {
    const orderDate = new Date(sampleDate);
    orderDate.setDate(orderDate.getDate() + daysUntilOrder);

    order = createTestOrder({
      customerId: sample.customerId,
      orderDate,
      status: config?.orderStatus ?? 'completed',
    });

    if (withinConversionWindow && order.status === 'completed') {
      sample.orderId = order.id;
    }
  }

  return {
    sample,
    order,
    withinConversionWindow,
  };
}

/**
 * Batch create sample scenarios
 */
export function createSampleScenarios(count: number): SampleScenario[] {
  return Array.from({ length: count }, () => createSampleScenario());
}
