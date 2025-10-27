import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Token Encryption Library
 *
 * Provides secure AES-256-GCM encryption for OAuth tokens and other sensitive data.
 * Uses environment variable ENCRYPTION_KEY for the master encryption key.
 *
 * @module token-encryption
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SCRYPT_N = 16384; // CPU/memory cost parameter
const SCRYPT_R = 8; // Block size parameter
const SCRYPT_P = 1; // Parallelization parameter

/**
 * Encryption error class for distinguishing encryption-specific errors
 */
export class EncryptionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

/**
 * Validates that the encryption key is properly configured and meets requirements.
 *
 * Requirements:
 * - ENCRYPTION_KEY environment variable must be set
 * - Key must be a valid hexadecimal string
 * - Key must be at least 32 bytes (64 hex characters) for AES-256
 *
 * @returns {boolean} True if encryption key is valid
 * @throws {EncryptionError} If validation fails
 *
 * @example
 * ```typescript
 * if (validateEncryptionKey()) {
 *   console.log('Encryption is properly configured');
 * }
 * ```
 */
export function validateEncryptionKey(): boolean {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new EncryptionError(
      'ENCRYPTION_KEY environment variable is not set',
      'MISSING_KEY'
    );
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(key)) {
    throw new EncryptionError(
      'ENCRYPTION_KEY must be a valid hexadecimal string',
      'INVALID_KEY_FORMAT'
    );
  }

  // Validate length (at least 32 bytes = 64 hex chars)
  if (key.length < 64) {
    throw new EncryptionError(
      'ENCRYPTION_KEY must be at least 32 bytes (64 hex characters) for AES-256',
      'INVALID_KEY_LENGTH'
    );
  }

  return true;
}

/**
 * Derives an encryption key from the master key and salt using scrypt.
 * This provides key stretching and domain separation.
 *
 * @param {Buffer} salt - Random salt for key derivation
 * @returns {Buffer} Derived 256-bit encryption key
 */
function deriveKey(salt: Buffer): Buffer {
  validateEncryptionKey();
  const masterKey = process.env.ENCRYPTION_KEY!;

  return scryptSync(
    Buffer.from(masterKey, 'hex'),
    salt,
    KEY_LENGTH,
    { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }
  );
}

// ============================================================================
// ENCRYPTION
// ============================================================================

/**
 * Encrypts plaintext using AES-256-GCM authenticated encryption.
 *
 * Process:
 * 1. Generates random salt for key derivation
 * 2. Derives encryption key using scrypt
 * 3. Generates random IV
 * 4. Encrypts plaintext with AES-256-GCM
 * 5. Returns base64-encoded package: salt || iv || authTag || ciphertext
 *
 * The output format ensures authenticated encryption and prevents tampering.
 * Each encryption uses unique salt and IV for maximum security.
 *
 * @param {string} plaintext - The plaintext string to encrypt
 * @returns {Promise<string>} Base64-encoded encrypted data package
 * @throws {EncryptionError} If encryption fails
 *
 * @example
 * ```typescript
 * const encrypted = await encryptToken('my-secret-oauth-token');
 * // Store encrypted in database
 * await prisma.integrationToken.update({
 *   data: { accessToken: encrypted }
 * });
 * ```
 */
export async function encryptToken(plaintext: string): Promise<string> {
  try {
    validateEncryptionKey();

    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derive encryption key
    const key = deriveKey(salt);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Package: salt || iv || authTag || ciphertext
    const package_ = Buffer.concat([salt, iv, authTag, encrypted]);

    // Return base64-encoded package
    return package_.toString('base64');
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      'ENCRYPTION_FAILED'
    );
  }
}

// ============================================================================
// DECRYPTION
// ============================================================================

/**
 * Decrypts ciphertext encrypted with encryptToken().
 *
 * Process:
 * 1. Decodes base64 package
 * 2. Extracts salt, IV, auth tag, and ciphertext
 * 3. Derives decryption key using scrypt
 * 4. Verifies authentication tag
 * 5. Decrypts ciphertext with AES-256-GCM
 * 6. Returns plaintext
 *
 * Authentication verification ensures data hasn't been tampered with.
 * Failures indicate either wrong key or corrupted/manipulated data.
 *
 * @param {string} ciphertext - Base64-encoded encrypted data package
 * @returns {Promise<string>} Decrypted plaintext
 * @throws {EncryptionError} If decryption or authentication fails
 *
 * @example
 * ```typescript
 * const encrypted = token.accessToken;
 * const plainToken = await decryptToken(encrypted);
 * // Use plainToken for API calls
 * ```
 */
export async function decryptToken(ciphertext: string): Promise<string> {
  try {
    validateEncryptionKey();

    // Decode base64 package
    const package_ = Buffer.from(ciphertext, 'base64');

    // Extract components
    const salt = package_.subarray(0, SALT_LENGTH);
    const iv = package_.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = package_.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = package_.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive decryption key
    const key = deriveKey(salt);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }

    // Authentication failures indicate tampering or wrong key
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unsupported state') || message.includes('auth')) {
      throw new EncryptionError(
        'Decryption failed: Authentication tag verification failed. Data may be corrupted or tampered with.',
        'AUTH_VERIFICATION_FAILED'
      );
    }

    throw new EncryptionError(
      `Decryption failed: ${message}`,
      'DECRYPTION_FAILED'
    );
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Determines if a string is encrypted (base64 package format).
 *
 * This is a heuristic check - it verifies:
 * 1. String is valid base64
 * 2. Decoded length matches expected package size
 *
 * Used for backward compatibility when migrating from plaintext tokens.
 *
 * @param {string} value - String to check
 * @returns {boolean} True if value appears to be encrypted
 *
 * @example
 * ```typescript
 * const token = await prisma.integrationToken.findUnique(...);
 * const accessToken = isEncrypted(token.accessToken)
 *   ? await decryptToken(token.accessToken)
 *   : token.accessToken; // Plaintext fallback
 * ```
 */
export function isEncrypted(value: string): boolean {
  try {
    // Check if valid base64
    const decoded = Buffer.from(value, 'base64');

    // Check minimum length (salt + iv + authTag + at least 1 byte ciphertext)
    const minLength = SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;

    return decoded.length >= minLength && /^[A-Za-z0-9+/=]+$/.test(value);
  } catch {
    return false;
  }
}

/**
 * Generates a secure random encryption key suitable for ENCRYPTION_KEY.
 *
 * For development and testing only. Production keys should be generated
 * securely and stored in a key management system.
 *
 * @returns {string} 64-character hexadecimal key (32 bytes)
 *
 * @example
 * ```bash
 * # Generate a new key for .env file
 * node -e "const {generateEncryptionKey} = require('./token-encryption'); console.log('ENCRYPTION_KEY=' + generateEncryptionKey())"
 * ```
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}
