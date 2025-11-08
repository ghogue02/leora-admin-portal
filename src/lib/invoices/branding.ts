export type BrandingOptionFields = {
  companyName?: string | null;
  companySecondary?: string | null;
  companyTagline?: string | null;
  companyAddressLines?: string[] | null;
  companyLicenseText?: string | null;
  companyContactLines?: string[] | null;
  companyWebsite?: string | null;
};

export type BrandingProfile = {
  name: string;
  secondary?: string;
  tagline?: string;
  addressLines: string[];
  licenseText?: string;
  contactLines: string[];
  website?: string;
};

export const DEFAULT_BRANDING_PROFILE: BrandingProfile = {
  name: 'Well Crafted Wine & Beverage Co.',
  secondary: '(formerly The Spanish Wine Importers LLC)',
  tagline: 'Fine Wine & Beverage Distribution',
  addressLines: ['6781 Kennedy Road Suite 8', 'Warrenton, VA 20187'],
  licenseText: 'VA ABC Wholesale #0903-123456',
  contactLines: ['Wholesaler #: 0903-123456', 'Voice: (540) 555-0198'],
  website: 'wellcraftedwine.com',
};

function sanitizeLines(lines?: string[] | null, fallback?: string[]): string[] {
  const cleaned = (lines ?? [])
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line && line.length));
  if (cleaned.length) {
    return cleaned.slice(0, 4);
  }
  return fallback ?? [];
}

export function resolveBrandingProfile(
  options?: BrandingOptionFields | null,
  fallback?: Partial<BrandingProfile>
): BrandingProfile {
  const base: BrandingProfile = {
    ...DEFAULT_BRANDING_PROFILE,
    ...fallback,
    addressLines: fallback?.addressLines ?? DEFAULT_BRANDING_PROFILE.addressLines,
    contactLines: fallback?.contactLines ?? DEFAULT_BRANDING_PROFILE.contactLines,
  };

  const safeOptions = options ?? {};

  return {
    name: safeOptions.companyName?.trim() || base.name,
    secondary:
      safeOptions.companySecondary?.trim() === ''
        ? undefined
        : safeOptions.companySecondary?.trim() ?? base.secondary,
    tagline:
      safeOptions.companyTagline?.trim() === ''
        ? undefined
        : safeOptions.companyTagline?.trim() ?? base.tagline,
    addressLines: sanitizeLines(safeOptions.companyAddressLines, base.addressLines),
    licenseText:
      safeOptions.companyLicenseText?.trim() === ''
        ? undefined
        : safeOptions.companyLicenseText?.trim() ?? base.licenseText,
    contactLines: sanitizeLines(safeOptions.companyContactLines, base.contactLines),
    website: safeOptions.companyWebsite?.trim() || base.website,
  };
}
