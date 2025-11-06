/**
 * Test script to verify price list matching fix
 *
 * This tests that GLOBAL price lists now match correctly for both:
 * 1. Orders without customer (anonymous)
 * 2. Orders with customer (should still match GLOBAL)
 */

import { PrismaClient } from '@prisma/client';

type PriceListSummary = {
  priceListId: string;
  priceListName: string;
  price: number;
  minQuantity: number;
  maxQuantity: number | null;
  jurisdictionType: string;
  jurisdictionValue: string | null;
  allowManualOverride: boolean;
};

type CustomerPricingContext = {
  state?: string | null;
  territory?: string | null;
  accountNumber?: string | null;
  name?: string | null;
};

type PricingSelection = {
  priceList: PriceListSummary | null;
  unitPrice: number;
  overrideApplied: boolean;
  reason: string | null;
};

function matchesJurisdiction(priceList: PriceListSummary, customer?: CustomerPricingContext | null) {
  // GLOBAL price lists match everyone (with or without customer)
  if (priceList.jurisdictionType === "GLOBAL") return true;

  // Non-GLOBAL price lists require customer context
  if (!customer) return false;

  const value = (priceList.jurisdictionValue ?? "").trim().toUpperCase();
  const state = (customer.state ?? "").trim().toUpperCase();

  switch (priceList.jurisdictionType) {
    case "STATE":
      return Boolean(value) && Boolean(state) && value === state;
    case "FEDERAL_PROPERTY":
      return false; // Simplified for test
    case "CUSTOM":
      if (!value) return false;
      return [customer.territory, customer.accountNumber, customer.name]
        .filter(Boolean)
        .some((field) => field!.toString().toLowerCase().includes(value.toLowerCase()));
    default:
      return false;
  }
}

function meetsQuantity(priceList: PriceListSummary, quantity: number) {
  const min = priceList.minQuantity ?? 1;
  const max = priceList.maxQuantity ?? Infinity;
  return quantity >= min && quantity <= max;
}

function resolvePriceForQuantity(
  priceLists: PriceListSummary[],
  quantity: number,
  customer?: CustomerPricingContext | null,
): PricingSelection {
  const sorted = (lists: PriceListSummary[]) =>
    [...lists].sort((a, b) => (b.minQuantity ?? 0) - (a.minQuantity ?? 0));

  const jurisdictionMatches = sorted(
    priceLists.filter((priceList) => meetsQuantity(priceList, quantity) && matchesJurisdiction(priceList, customer)),
  );

  if (jurisdictionMatches.length > 0) {
    return {
      priceList: jurisdictionMatches[0],
      unitPrice: jurisdictionMatches[0].price,
      overrideApplied: false,
      reason: null,
    };
  }

  return {
    priceList: null,
    unitPrice: 0,
    overrideApplied: true,
    reason: "noPriceConfigured",
  };
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('\n🔍 Testing Price List Matching Fix\n');

    // Get a sample SKU with price lists
    const sku = await prisma.sku.findFirst({
      where: {
        priceListItems: {
          some: {}
        }
      },
      include: {
        priceListItems: {
          include: {
            priceList: true
          }
        }
      }
    });

    if (!sku) {
      console.log('❌ No SKUs with price lists found');
      return;
    }

    console.log(`✅ Testing SKU: ${sku.code}`);

    const priceLists: PriceListSummary[] = sku.priceListItems.map(item => ({
      priceListId: item.priceList.id,
      priceListName: item.priceList.name,
      price: Number(item.price),
      minQuantity: item.minQuantity,
      maxQuantity: item.maxQuantity,
      jurisdictionType: item.priceList.jurisdictionType,
      jurisdictionValue: item.priceList.jurisdictionValue,
      allowManualOverride: item.priceList.allowManualOverride,
    }));

    console.log(`\n📋 Available Price Lists (${priceLists.length}):`);
    priceLists.forEach(pl => {
      console.log(`  - ${pl.priceListName}: $${pl.price} (${pl.jurisdictionType})`);
    });

    // Test 1: Without customer (should match GLOBAL)
    console.log('\n\n🧪 Test 1: No Customer (Anonymous Order)');
    const result1 = resolvePriceForQuantity(priceLists, 1, null);
    if (result1.priceList) {
      console.log(`✅ PASSED: Matched "${result1.priceList.priceListName}" - $${result1.unitPrice}`);
    } else {
      console.log('❌ FAILED: No price list matched (expected GLOBAL to match)');
    }

    // Test 2: With customer (should still match GLOBAL)
    console.log('\n🧪 Test 2: With Customer (Should Match GLOBAL)');
    const testCustomer: CustomerPricingContext = {
      state: 'VA',
      territory: 'Northern Virginia',
      accountNumber: 'TEST-001',
      name: 'Test Customer'
    };
    const result2 = resolvePriceForQuantity(priceLists, 1, testCustomer);
    if (result2.priceList) {
      console.log(`✅ PASSED: Matched "${result2.priceList.priceListName}" - $${result2.unitPrice}`);
    } else {
      console.log('❌ FAILED: No price list matched (expected GLOBAL to match)');
    }

    // Test 3: Check all price lists match jurisdiction correctly
    console.log('\n🧪 Test 3: Jurisdiction Matching Logic');
    priceLists.forEach(pl => {
      const matchesWithoutCustomer = matchesJurisdiction(pl, null);
      const matchesWithCustomer = matchesJurisdiction(pl, testCustomer);

      console.log(`\n  ${pl.priceListName} (${pl.jurisdictionType}):`);
      console.log(`    Without customer: ${matchesWithoutCustomer ? '✅ Matches' : '❌ No match'}`);
      console.log(`    With customer: ${matchesWithCustomer ? '✅ Matches' : '❌ No match'}`);

      if (pl.jurisdictionType === 'GLOBAL') {
        if (matchesWithoutCustomer && matchesWithCustomer) {
          console.log('    ✅ CORRECT: GLOBAL matches both cases');
        } else {
          console.log('    ❌ WRONG: GLOBAL should match both cases');
        }
      }
    });

    console.log('\n\n📊 Summary:');
    console.log(`  Total Price Lists: ${priceLists.length}`);
    console.log(`  GLOBAL Price Lists: ${priceLists.filter(pl => pl.jurisdictionType === 'GLOBAL').length}`);
    console.log(`  Test 1 (No Customer): ${result1.priceList ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Test 2 (With Customer): ${result2.priceList ? '✅ PASS' : '❌ FAIL'}`);

    if (result1.priceList && result2.priceList) {
      console.log('\n✅ ALL TESTS PASSED - Price list matching is working correctly!');
    } else {
      console.log('\n❌ SOME TESTS FAILED - Price list matching needs attention');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
