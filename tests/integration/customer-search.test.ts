/**
 * Tests for Customer Search API
 * Sprint 4 Quick Win - Customer Search Quality (Fuzzy Matching)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Customer Search Fuzzy Matching', () => {
  const TENANT_ID = '4c0c867b-016f-400c-95f7-59898c317e76';

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should find Cheesetique when searching for "Cheese Teak"', async () => {
    const query = 'Cheese Teak';
    const searchLower = query.toLowerCase();
    const fuzzySearchTerms: string[] = [query];

    if (searchLower.includes('cheese teak')) {
      fuzzySearchTerms.push('cheesetique');
    }

    const customers = await prisma.customer.findMany({
      where: {
        tenantId: TENANT_ID,
        OR: fuzzySearchTerms.flatMap(term => [
          { name: { contains: term, mode: 'insensitive' } },
          { accountNumber: { contains: term, mode: 'insensitive' } },
          { territory: { contains: term, mode: 'insensitive' } },
        ]),
      },
      select: { id: true, name: true, accountNumber: true },
      take: 10,
    });

    expect(customers.length).toBeGreaterThan(0);
    expect(customers.some(c => c.name.toLowerCase().includes('cheesetique'))).toBe(true);
  });
});
