#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

async function findTables() {
  console.log('Testing different table name variations...\n');

  const variations = [
    'orderline',
    'OrderLine',
    'orderLine',
    'order_line',
    'Order_Line',
    'order',
    'Order',
    'orders',
    'Orders'
  ];

  for (const name of variations) {
    try {
      const { data, error } = await lovable
        .from(name)
        .select('id')
        .limit(1);

      if (!error) {
        console.log(`✓ Found table: "${name}" (has ${data?.length || 0} records in sample)`);
      } else {
        console.log(`✗ "${name}": ${error.message}`);
      }
    } catch (e: any) {
      console.log(`✗ "${name}": ${e.message}`);
    }
  }
}

findTables();
