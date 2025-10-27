import { describe, it, expect } from 'vitest';
import { formatSkuLabel } from '../format';

describe('formatSkuLabel', () => {
  it('combines brand, name, and code when distinct', () => {
    const label = formatSkuLabel({
      code: 'ABC-123',
      product: { brand: 'Well Crafted', name: 'Merlot Reserve 2022' },
    });
    expect(label).toBe('Well Crafted • Merlot Reserve 2022 (ABC-123)');
  });

  it('omits duplicate brand when already present in name', () => {
    const label = formatSkuLabel({
      code: 'CAB-001',
      product: { brand: 'Cabernet NV', name: 'Cabernet NV' },
    });
    expect(label).toBe('Cabernet NV (CAB-001)');
  });

  it('ignores non-alphabetic brand fragments', () => {
    const label = formatSkuLabel({
      code: 'MER-750',
      product: { brand: '0 0 0.750 0.00', name: 'Aspect Merlot 2021' },
    });
    expect(label).toBe('Aspect Merlot 2021 (MER-750)');
  });

  it('falls back to code when name and brand missing', () => {
    const label = formatSkuLabel({
      code: 'NO-DATA',
      product: {},
    });
    expect(label).toBe('NO-DATA');
  });

  it('supports omitting code when requested', () => {
    const label = formatSkuLabel(
      {
        code: 'CHD-500',
        product: { brand: 'Downtown Winery', name: 'Downtown Chardonnay' },
      },
      { includeCode: false }
    );
    expect(label).toBe('Downtown Winery • Downtown Chardonnay');
  });
});
