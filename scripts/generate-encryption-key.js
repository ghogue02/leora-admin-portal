#!/usr/bin/env node

/**
 * Encryption Key Generator
 *
 * Generates a cryptographically secure 32-byte (256-bit) encryption key
 * for AES-256-GCM token encryption.
 *
 * Usage:
 *   node generate-encryption-key.js
 *   ./generate-encryption-key.js (if executable)
 *
 * Output:
 *   64 hexadecimal characters representing 32 bytes
 */

const crypto = require('crypto');

// Generate 32 bytes (256 bits) of cryptographically secure random data
const keyBuffer = crypto.randomBytes(32);

// Convert to hexadecimal string (64 characters)
const keyHex = keyBuffer.toString('hex');

// Display result
console.log('\n🔐 Generated Encryption Key (AES-256-GCM)\n');
console.log('═'.repeat(70));
console.log('\n' + keyHex + '\n');
console.log('═'.repeat(70));
console.log('\n⚠️  IMPORTANT SECURITY NOTES:\n');
console.log('   1. Keep this key SECRET - never commit to version control');
console.log('   2. Add to .env file: ENCRYPTION_KEY=' + keyHex);
console.log('   3. In production, use environment variables or secrets manager');
console.log('   4. Rotate quarterly for security best practices');
console.log('   5. If compromised, generate new key and force user re-authentication\n');
console.log('📋 Key Details:\n');
console.log('   Format:     Hexadecimal');
console.log('   Length:     64 characters (32 bytes)');
console.log('   Algorithm:  AES-256-GCM');
console.log('   Entropy:    256 bits');
console.log('   Generated:  ' + new Date().toISOString());
console.log('   Prefix:     ' + keyHex.substring(0, 8) + '...');
console.log('   Suffix:     ...' + keyHex.substring(56));
console.log('\n✅ Copy the key above and add it to your .env file\n');

// Optionally, write instructions for validation
console.log('🔍 To validate the key after adding to .env:\n');
console.log('   node -e "');
console.log('     const key = process.env.ENCRYPTION_KEY;');
console.log('     if (!key || key.length !== 64 || !/^[0-9a-f]{64}$/i.test(key)) {');
console.log('       console.error(\'❌ Invalid ENCRYPTION_KEY\');');
console.log('       process.exit(1);');
console.log('     }');
console.log('     console.log(\'✅ ENCRYPTION_KEY is valid\');');
console.log('   "\n');
