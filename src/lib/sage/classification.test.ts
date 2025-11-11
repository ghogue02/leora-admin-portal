import { describe, expect, it } from 'vitest';
import {
  SageOrderCategory,
  classifyOrderForExport,
} from './classification';

const baseOrder = {
  customer: { name: 'Standard Customer' },
  lines: [
    { quantity: 12, unitPrice: 15.5, isSample: false },
    { quantity: 6, unitPrice: 10, isSample: false },
  ],
};

describe('classifyOrderForExport', () => {
  it('marks default orders as STANDARD', () => {
    expect(classifyOrderForExport(baseOrder)).toBe(SageOrderCategory.STANDARD);
  });

  it('detects storage customers by prefix', () => {
    expect(
      classifyOrderForExport({
        ...baseOrder,
        customer: { name: 'RIO- Warehouse' },
      })
    ).toBe(SageOrderCategory.STORAGE);
  });

  it('detects samples by customer name', () => {
    expect(
      classifyOrderForExport({
        ...baseOrder,
        customer: { name: 'Mike Allen Samples' },
      })
    ).toBe(SageOrderCategory.SAMPLE);
  });

  it('detects samples when every line is zero priced', () => {
    expect(
      classifyOrderForExport({
        ...baseOrder,
        customer: { name: 'Regular Account' },
        lines: [
          { quantity: 1, unitPrice: 0 },
          { quantity: 2, unitPrice: '0.00' },
        ],
      })
    ).toBe(SageOrderCategory.SAMPLE);
  });

  it('treats non-zero priced lines as standard even if one line is zero', () => {
    expect(
      classifyOrderForExport({
        ...baseOrder,
        lines: [
          { quantity: 1, unitPrice: 0 },
          { quantity: 2, unitPrice: 10 },
        ],
      })
    ).toBe(SageOrderCategory.STANDARD);
  });
});
