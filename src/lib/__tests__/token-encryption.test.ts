import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  encryptToken,
  decryptToken,
  validateEncryptionKey,
  isEncrypted,
  generateEncryptionKey,
  EncryptionError,
} from '../token-encryption';

describe('Token Encryption', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;
  const testKey = 'a'.repeat(64); // 32 bytes in hex

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('validateEncryptionKey', () => {
    it('should validate a correct encryption key', () => {
      expect(() => validateEncryptionKey()).not.toThrow();
      expect(validateEncryptionKey()).toBe(true);
    });

    it('should throw if ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => validateEncryptionKey()).toThrow(EncryptionError);
      expect(() => validateEncryptionKey()).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw if key is not valid hex', () => {
      process.env.ENCRYPTION_KEY = 'not-a-hex-string-xyz';
      expect(() => validateEncryptionKey()).toThrow(EncryptionError);
      expect(() => validateEncryptionKey()).toThrow('must be a valid hexadecimal string');
    });

    it('should throw if key is too short', () => {
      process.env.ENCRYPTION_KEY = 'abc123'; // Only 3 bytes
      expect(() => validateEncryptionKey()).toThrow(EncryptionError);
      expect(() => validateEncryptionKey()).toThrow('must be at least 32 bytes');
    });
  });

  describe('encryptToken', () => {
    it('should encrypt a plaintext token', async () => {
      const plaintext = 'my-secret-oauth-token';
      const encrypted = await encryptToken(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const plaintext = 'test-token';
      const encrypted1 = await encryptToken(plaintext);
      const encrypted2 = await encryptToken(plaintext);

      // Due to random IV and salt, each encryption should be unique
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt empty string', async () => {
      const encrypted = await encryptToken('');
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should encrypt long tokens', async () => {
      const longToken = 'x'.repeat(1000);
      const encrypted = await encryptToken(longToken);
      expect(encrypted).toBeDefined();
    });

    it('should encrypt tokens with special characters', async () => {
      const specialToken = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = await encryptToken(specialToken);
      expect(encrypted).toBeDefined();
    });

    it('should throw if encryption key is invalid', async () => {
      delete process.env.ENCRYPTION_KEY;
      await expect(encryptToken('test')).rejects.toThrow(EncryptionError);
    });
  });

  describe('decryptToken', () => {
    it('should decrypt encrypted token to original plaintext', async () => {
      const plaintext = 'my-secret-oauth-token';
      const encrypted = await encryptToken(plaintext);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string roundtrip', async () => {
      const encrypted = await encryptToken('');
      const decrypted = await decryptToken(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle long tokens roundtrip', async () => {
      const longToken = 'y'.repeat(1000);
      const encrypted = await encryptToken(longToken);
      const decrypted = await decryptToken(encrypted);
      expect(decrypted).toBe(longToken);
    });

    it('should handle special characters roundtrip', async () => {
      const specialToken = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = await encryptToken(specialToken);
      const decrypted = await decryptToken(encrypted);
      expect(decrypted).toBe(specialToken);
    });

    it('should throw on corrupted ciphertext', async () => {
      const plaintext = 'test-token';
      const encrypted = await encryptToken(plaintext);

      // Corrupt the ciphertext by modifying a character
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';

      await expect(decryptToken(corrupted)).rejects.toThrow(EncryptionError);
    });

    it('should throw on invalid base64', async () => {
      await expect(decryptToken('not-valid-base64!@#$')).rejects.toThrow(EncryptionError);
    });

    it('should throw on wrong encryption key', async () => {
      const plaintext = 'test-token';
      const encrypted = await encryptToken(plaintext);

      // Change the encryption key
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      await expect(decryptToken(encrypted)).rejects.toThrow(EncryptionError);
    });

    it('should throw if encryption key is missing', async () => {
      const plaintext = 'test-token';
      const encrypted = await encryptToken(plaintext);

      delete process.env.ENCRYPTION_KEY;

      await expect(decryptToken(encrypted)).rejects.toThrow(EncryptionError);
    });

    it('should detect authentication tag verification failure', async () => {
      const plaintext = 'test-token';
      const encrypted = await encryptToken(plaintext);

      // Decode, modify auth tag area, re-encode
      const buffer = Buffer.from(encrypted, 'base64');
      // Modify auth tag (bytes 64-80)
      buffer[70] = buffer[70] ^ 0xFF;
      const tampered = buffer.toString('base64');

      await expect(decryptToken(tampered)).rejects.toThrow('Authentication tag verification failed');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted tokens', async () => {
      const encrypted = await encryptToken('test-token');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(isEncrypted('plaintext-token')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for invalid base64', () => {
      expect(isEncrypted('not-base64!@#$')).toBe(false);
    });

    it('should return false for short base64 strings', () => {
      expect(isEncrypted('YWJj')).toBe(false); // "abc" in base64
    });

    it('should handle edge cases gracefully', () => {
      expect(isEncrypted('=')).toBe(false);
      expect(isEncrypted('==')).toBe(false);
      expect(isEncrypted('    ')).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid encryption key', () => {
      const key = generateEncryptionKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[0-9a-f]+$/.test(key)).toBe(true); // Valid hex
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate keys that work for encryption', async () => {
      const newKey = generateEncryptionKey();
      process.env.ENCRYPTION_KEY = newKey;

      const plaintext = 'test-with-new-key';
      const encrypted = await encryptToken(plaintext);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('EncryptionError', () => {
    it('should include error code', () => {
      const error = new EncryptionError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('EncryptionError');
    });

    it('should be instanceof Error', () => {
      const error = new EncryptionError('Test', 'CODE');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Integration: Full encryption/decryption cycle', () => {
    it('should handle OAuth token lifecycle', async () => {
      // Simulate OAuth token storage
      const oauthToken = {
        accessToken: 'ya29.a0AfH6SMBx...',
        refreshToken: '1//0eXXXXXXXXXXX...',
      };

      // Encrypt before storing
      const encryptedAccess = await encryptToken(oauthToken.accessToken);
      const encryptedRefresh = await encryptToken(oauthToken.refreshToken);

      // Simulate storage and retrieval
      const stored = {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
      };

      // Decrypt for use
      const decryptedAccess = await decryptToken(stored.accessToken);
      const decryptedRefresh = await decryptToken(stored.refreshToken);

      expect(decryptedAccess).toBe(oauthToken.accessToken);
      expect(decryptedRefresh).toBe(oauthToken.refreshToken);
    });

    it('should handle backward compatibility check', async () => {
      const plaintextToken = 'old-plaintext-token';
      const encryptedToken = await encryptToken('new-encrypted-token');

      // Backward compatibility: check before decryption
      const token1 = isEncrypted(plaintextToken)
        ? await decryptToken(plaintextToken)
        : plaintextToken;

      const token2 = isEncrypted(encryptedToken)
        ? await decryptToken(encryptedToken)
        : encryptedToken;

      expect(token1).toBe('old-plaintext-token');
      expect(token2).toBe('new-encrypted-token');
    });
  });

  describe('Security properties', () => {
    it('should use unique IV for each encryption', async () => {
      const plaintext = 'same-plaintext';

      const encrypted1 = await encryptToken(plaintext);
      const encrypted2 = await encryptToken(plaintext);

      const buffer1 = Buffer.from(encrypted1, 'base64');
      const buffer2 = Buffer.from(encrypted2, 'base64');

      // Extract IVs (after 64-byte salt)
      const iv1 = buffer1.subarray(64, 80);
      const iv2 = buffer2.subarray(64, 80);

      expect(iv1.equals(iv2)).toBe(false);
    });

    it('should use unique salt for each encryption', async () => {
      const plaintext = 'same-plaintext';

      const encrypted1 = await encryptToken(plaintext);
      const encrypted2 = await encryptToken(plaintext);

      const buffer1 = Buffer.from(encrypted1, 'base64');
      const buffer2 = Buffer.from(encrypted2, 'base64');

      // Extract salts (first 64 bytes)
      const salt1 = buffer1.subarray(0, 64);
      const salt2 = buffer2.subarray(0, 64);

      expect(salt1.equals(salt2)).toBe(false);
    });
  });
});
