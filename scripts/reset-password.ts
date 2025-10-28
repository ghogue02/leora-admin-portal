#!/usr/bin/env node
import bcrypt from 'bcryptjs';

// This script generates a properly hashed password
// Usage: npx tsx scripts/reset-password.ts

const password = 'SalesDemo2025!';

async function generateHash() {
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('='.repeat(80));
  console.log('PASSWORD HASH GENERATOR');
  console.log('='.repeat(80));
  console.log('');
  console.log('Password:', password);
  console.log('');
  console.log('Bcrypt Hash:');
  console.log(hashedPassword);
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('SQL to update Travis user:');
  console.log('');
  console.log(`UPDATE "User" SET "hashedPassword" = '${hashedPassword}' WHERE email = 'travis@wellcrafted.com';`);
  console.log('');
  console.log('='.repeat(80));
}

generateHash();
