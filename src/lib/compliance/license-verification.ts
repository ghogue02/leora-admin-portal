// License verification and compliance tracking

export interface LicenseVerificationResult {
  isValid: boolean;
  status: 'active' | 'expired' | 'suspended' | 'revoked' | 'not_found';
  expirationDate?: string;
  issueDate?: string;
  businessName?: string;
  address?: string;
  warnings?: string[];
  errors?: string[];
}

export interface LicenseAlert {
  id: string;
  customerId: string;
  licenseNumber: string;
  alertType: 'expiring_soon' | 'expired' | 'suspended' | 'missing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  daysUntilExpiration?: number;
  createdAt: string;
}

/**
 * Verify liquor license with state/local authorities
 * NOTE: This is a placeholder - actual implementation depends on your jurisdiction's API
 */
export async function verifyLicense(
  licenseNumber: string,
  state?: string
): Promise<LicenseVerificationResult> {
  try {
    // TODO: Implement actual API call to state liquor control board
    // Different states have different APIs:
    // - California: ABC API
    // - New York: SLA API
    // - Texas: TABC API
    // etc.

    // For now, simulate verification
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock response based on license format
    const isValidFormat = /^[A-Z0-9-]{5,20}$/i.test(licenseNumber);

    if (!isValidFormat) {
      return {
        isValid: false,
        status: 'not_found',
        errors: ['Invalid license number format'],
      };
    }

    // Simulate a verified license
    return {
      isValid: true,
      status: 'active',
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      businessName: 'Sample Business LLC',
    };
  } catch (error) {
    return {
      isValid: false,
      status: 'not_found',
      errors: [error instanceof Error ? error.message : 'Verification failed'],
    };
  }
}

/**
 * Check if license is expiring soon
 */
export function isLicenseExpiringSoon(expirationDate: string, daysThreshold: number = 30): boolean {
  const expiry = new Date(expirationDate);
  const today = new Date();
  const daysUntilExpiration = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilExpiration > 0 && daysUntilExpiration <= daysThreshold;
}

/**
 * Check if license is expired
 */
export function isLicenseExpired(expirationDate: string): boolean {
  const expiry = new Date(expirationDate);
  const today = new Date();
  return expiry < today;
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string): number {
  const expiry = new Date(expirationDate);
  const today = new Date();
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Generate compliance alerts for customers
 */
export function generateLicenseAlerts(customers: {
  id: string;
  licenseNumber?: string;
  licenseExpiration?: string;
}[]): LicenseAlert[] {
  const alerts: LicenseAlert[] = [];
  const today = new Date();

  for (const customer of customers) {
    if (!customer.licenseNumber) {
      // Missing license
      alerts.push({
        id: `alert-${customer.id}-missing`,
        customerId: customer.id,
        licenseNumber: '',
        alertType: 'missing',
        severity: 'high',
        message: 'Customer does not have a liquor license on file',
        createdAt: today.toISOString(),
      });
      continue;
    }

    if (!customer.licenseExpiration) {
      continue;
    }

    const daysUntilExpiration = getDaysUntilExpiration(customer.licenseExpiration);

    if (daysUntilExpiration < 0) {
      // Expired
      alerts.push({
        id: `alert-${customer.id}-expired`,
        customerId: customer.id,
        licenseNumber: customer.licenseNumber,
        alertType: 'expired',
        severity: 'critical',
        message: `License expired ${Math.abs(daysUntilExpiration)} days ago`,
        daysUntilExpiration,
        createdAt: today.toISOString(),
      });
    } else if (daysUntilExpiration <= 7) {
      // Expiring within a week
      alerts.push({
        id: `alert-${customer.id}-critical`,
        customerId: customer.id,
        licenseNumber: customer.licenseNumber,
        alertType: 'expiring_soon',
        severity: 'critical',
        message: `License expires in ${daysUntilExpiration} days`,
        daysUntilExpiration,
        createdAt: today.toISOString(),
      });
    } else if (daysUntilExpiration <= 30) {
      // Expiring within a month
      alerts.push({
        id: `alert-${customer.id}-warning`,
        customerId: customer.id,
        licenseNumber: customer.licenseNumber,
        alertType: 'expiring_soon',
        severity: 'high',
        message: `License expires in ${daysUntilExpiration} days`,
        daysUntilExpiration,
        createdAt: today.toISOString(),
      });
    } else if (daysUntilExpiration <= 60) {
      // Expiring within 2 months
      alerts.push({
        id: `alert-${customer.id}-info`,
        customerId: customer.id,
        licenseNumber: customer.licenseNumber,
        alertType: 'expiring_soon',
        severity: 'medium',
        message: `License expires in ${daysUntilExpiration} days`,
        daysUntilExpiration,
        createdAt: today.toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Get alert severity color for UI
 */
export function getAlertColor(severity: LicenseAlert['severity']): {
  bg: string;
  border: string;
  text: string;
} {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-700',
      };
    case 'high':
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-500',
        text: 'text-orange-700',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        text: 'text-yellow-700',
      };
    case 'low':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        text: 'text-blue-700',
      };
  }
}
