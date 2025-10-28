import { describe, it, expect } from 'vitest';
import {
  isLicenseExpiringSoon,
  isLicenseExpired,
  getDaysUntilExpiration,
  generateLicenseAlerts,
} from '@/lib/compliance/license-verification';

describe('License Compliance', () => {
  describe('License Expiration Checks', () => {
    it('should detect license expiring within 30 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);

      const result = isLicenseExpiringSoon(futureDate.toISOString());

      expect(result).toBe(true);
    });

    it('should not detect license expiring beyond 30 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 40);

      const result = isLicenseExpiringSoon(futureDate.toISOString());

      expect(result).toBe(false);
    });

    it('should detect expired license', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const result = isLicenseExpired(pastDate.toISOString());

      expect(result).toBe(true);
    });

    it('should not detect valid license as expired', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const result = isLicenseExpired(futureDate.toISOString());

      expect(result).toBe(false);
    });

    it('should calculate days until expiration correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const days = getDaysUntilExpiration(futureDate.toISOString());

      expect(days).toBe(15);
    });

    it('should return negative days for expired licenses', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const days = getDaysUntilExpiration(pastDate.toISOString());

      expect(days).toBeLessThan(0);
    });
  });

  describe('License Alert Generation', () => {
    it('should generate alert for missing license', () => {
      const customers = [
        {
          id: 'customer-1',
          licenseNumber: undefined,
          licenseExpiration: undefined,
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('missing');
      expect(alerts[0].severity).toBe('high');
    });

    it('should generate critical alert for expired license', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const customers = [
        {
          id: 'customer-1',
          licenseNumber: 'ABC-123',
          licenseExpiration: pastDate.toISOString(),
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('expired');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should generate critical alert for license expiring in 7 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const customers = [
        {
          id: 'customer-1',
          licenseNumber: 'ABC-123',
          licenseExpiration: futureDate.toISOString(),
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('expiring_soon');
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].daysUntilExpiration).toBe(5);
    });

    it('should generate high alert for license expiring in 30 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);

      const customers = [
        {
          id: 'customer-1',
          licenseNumber: 'ABC-123',
          licenseExpiration: futureDate.toISOString(),
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('high');
    });

    it('should generate medium alert for license expiring in 60 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);

      const customers = [
        {
          id: 'customer-1',
          licenseNumber: 'ABC-123',
          licenseExpiration: futureDate.toISOString(),
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('medium');
    });

    it('should not generate alerts for licenses expiring beyond 60 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);

      const customers = [
        {
          id: 'customer-1',
          licenseNumber: 'ABC-123',
          licenseExpiration: futureDate.toISOString(),
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts).toHaveLength(0);
    });

    it('should handle multiple customers with various statuses', () => {
      const expired = new Date();
      expired.setDate(expired.getDate() - 10);

      const soonExpiring = new Date();
      soonExpiring.setDate(soonExpiring.getDate() + 15);

      const valid = new Date();
      valid.setDate(valid.getDate() + 180);

      const customers = [
        {
          id: 'customer-1',
          licenseNumber: undefined,
          licenseExpiration: undefined,
        },
        {
          id: 'customer-2',
          licenseNumber: 'ABC-123',
          licenseExpiration: expired.toISOString(),
        },
        {
          id: 'customer-3',
          licenseNumber: 'XYZ-789',
          licenseExpiration: soonExpiring.toISOString(),
        },
        {
          id: 'customer-4',
          licenseNumber: 'DEF-456',
          licenseExpiration: valid.toISOString(),
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      // Should have 3 alerts (missing, expired, expiring soon)
      expect(alerts).toHaveLength(3);

      // Check alert types
      const alertTypes = alerts.map((a) => a.alertType);
      expect(alertTypes).toContain('missing');
      expect(alertTypes).toContain('expired');
      expect(alertTypes).toContain('expiring_soon');
    });

    it('should include customer ID in alerts', () => {
      const customers = [
        {
          id: 'customer-123',
          licenseNumber: undefined,
          licenseExpiration: undefined,
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts[0].customerId).toBe('customer-123');
    });

    it('should include license number in alerts', () => {
      const expired = new Date();
      expired.setDate(expired.getDate() - 5);

      const customers = [
        {
          id: 'customer-1',
          licenseNumber: 'ABC-123456',
          licenseExpiration: expired.toISOString(),
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts[0].licenseNumber).toBe('ABC-123456');
    });

    it('should generate descriptive messages', () => {
      const customers = [
        {
          id: 'customer-1',
          licenseNumber: undefined,
          licenseExpiration: undefined,
        },
      ];

      const alerts = generateLicenseAlerts(customers);

      expect(alerts[0].message).toContain('does not have a liquor license');
    });
  });

  describe('Custom Threshold Testing', () => {
    it('should respect custom expiration threshold', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 50);

      // Default 30 days
      expect(isLicenseExpiringSoon(futureDate.toISOString())).toBe(false);

      // Custom 60 days
      expect(isLicenseExpiringSoon(futureDate.toISOString(), 60)).toBe(true);
    });

    it('should handle edge case at exact threshold', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const result = isLicenseExpiringSoon(futureDate.toISOString(), 30);

      expect(result).toBe(true);
    });
  });
});
