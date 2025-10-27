import {
  calculatePickOrder,
  parseLocation,
  extractNumber,
  isValidLocation,
  formatLocation,
  type LocationComponents,
} from '../warehouse';

describe('extractNumber', () => {
  it('should extract numbers from standard formats', () => {
    expect(extractNumber('A3')).toBe(3);
    expect(extractNumber('R2')).toBe(2);
    expect(extractNumber('S5')).toBe(5);
  });

  it('should handle word-based formats', () => {
    expect(extractNumber('Aisle-10')).toBe(10);
    expect(extractNumber('Row-5')).toBe(5);
    expect(extractNumber('Shelf-12')).toBe(12);
  });

  it('should handle variations in spacing and case', () => {
    expect(extractNumber('aisle 3')).toBe(3);
    expect(extractNumber('ROW_2')).toBe(2);
    expect(extractNumber('Shelf-5')).toBe(5);
  });

  it('should handle edge cases', () => {
    expect(extractNumber(null)).toBeNull();
    expect(extractNumber(undefined)).toBeNull();
    expect(extractNumber('')).toBeNull();
    expect(extractNumber('   ')).toBeNull();
    expect(extractNumber('ABC')).toBeNull();
  });

  it('should extract only the numeric portion', () => {
    expect(extractNumber('A3B')).toBe(3);
    expect(extractNumber('Row-5B')).toBe(5);
    expect(extractNumber('12XYZ')).toBe(12);
  });
});

describe('parseLocation', () => {
  it('should parse delimiter-based formats', () => {
    const tests = [
      'A1-R2-S3',
      'A1/R2/S3',
      'A1|R2|S3',
      'A1,R2,S3',
    ];

    tests.forEach((location) => {
      const result = parseLocation(location);
      expect(result.success).toBe(true);
      expect(result.components).toEqual({ aisle: 1, row: 2, shelf: 3 });
      expect(result.pickOrder).toBe(10203);
    });
  });

  it('should parse word-based formats', () => {
    const tests = [
      'Aisle 1, Row 2, Shelf 3',
      'Aisle-1 Row-2 Shelf-3',
      'aisle:1 row:2 shelf:3',
    ];

    tests.forEach((location) => {
      const result = parseLocation(location);
      expect(result.success).toBe(true);
      expect(result.components).toEqual({ aisle: 1, row: 2, shelf: 3 });
    });
  });

  it('should parse object format', () => {
    const location = { aisle: 'A3', row: 'R2', shelf: 'S5' };
    const result = parseLocation(location);

    expect(result.success).toBe(true);
    expect(result.components).toEqual({ aisle: 3, row: 2, shelf: 5 });
    expect(result.pickOrder).toBe(30205);
  });

  it('should handle null/undefined inputs', () => {
    expect(parseLocation(null).success).toBe(false);
    expect(parseLocation(undefined).success).toBe(false);
    expect(parseLocation('').success).toBe(false);
  });

  it('should validate component ranges', () => {
    // Negative numbers - object format with explicit negative
    const negative = parseLocation({ aisle: '-1', row: '2', shelf: '3' });
    expect(negative.success).toBe(false);
    expect(negative.error).toContain('non-negative');

    // Exceeding maximum values
    const tooLargeAisle = parseLocation('A1000-R2-S3');
    expect(tooLargeAisle.success).toBe(false);
    expect(tooLargeAisle.error).toContain('maximum values');

    const tooLargeRow = parseLocation('A10-R100-S3');
    expect(tooLargeRow.success).toBe(false);
    expect(tooLargeRow.error).toContain('maximum values');

    const tooLargeShelf = parseLocation('A10-R5-S100');
    expect(tooLargeShelf.success).toBe(false);
    expect(tooLargeShelf.error).toContain('maximum values');
  });

  it('should handle incomplete location data', () => {
    const incomplete = parseLocation('A1-R2');
    expect(incomplete.success).toBe(false);
    expect(incomplete.error).toContain('Unable to parse');
  });

  it('should handle special characters and mixed formats', () => {
    const special = parseLocation('Aisle#5 / Row-10 / Shelf_3');
    expect(special.success).toBe(true);
    expect(special.components).toEqual({ aisle: 5, row: 10, shelf: 3 });
  });
});

describe('calculatePickOrder', () => {
  it('should calculate pickOrder with standard inputs', () => {
    expect(calculatePickOrder({ aisle: 1, row: 1, shelf: 1 })).toBe(10101);
    expect(calculatePickOrder({ aisle: 1, row: 2, shelf: 3 })).toBe(10203);
    expect(calculatePickOrder({ aisle: 10, row: 5, shelf: 12 })).toBe(100512);
  });

  it('should handle zero values', () => {
    expect(calculatePickOrder({ aisle: 0, row: 0, shelf: 0 })).toBe(0);
    expect(calculatePickOrder({ aisle: 1, row: 0, shelf: 0 })).toBe(10000);
  });

  it('should handle maximum values', () => {
    expect(calculatePickOrder({ aisle: 999, row: 99, shelf: 99 })).toBe(9999999);
  });

  it('should handle string inputs by parsing', () => {
    const result = calculatePickOrder({
      aisle: 'A3',
      row: 'R2',
      shelf: 'S5'
    } as any);
    expect(result).toBe(30205);
  });

  it('should throw on negative values', () => {
    expect(() => {
      calculatePickOrder({ aisle: -1, row: 2, shelf: 3 });
    }).toThrow('non-negative');
  });

  it('should throw on values exceeding limits', () => {
    expect(() => {
      calculatePickOrder({ aisle: 1000, row: 2, shelf: 3 });
    }).toThrow('maximum values');
  });

  it('should throw on invalid types', () => {
    expect(() => {
      calculatePickOrder({ aisle: 'invalid', row: 'x', shelf: 'y' } as any);
    }).toThrow();
  });

  it('should create natural sorting order', () => {
    const orders = [
      { loc: { aisle: 1, row: 1, shelf: 1 }, order: calculatePickOrder({ aisle: 1, row: 1, shelf: 1 }) },
      { loc: { aisle: 1, row: 1, shelf: 2 }, order: calculatePickOrder({ aisle: 1, row: 1, shelf: 2 }) },
      { loc: { aisle: 1, row: 2, shelf: 1 }, order: calculatePickOrder({ aisle: 1, row: 2, shelf: 1 }) },
      { loc: { aisle: 2, row: 1, shelf: 1 }, order: calculatePickOrder({ aisle: 2, row: 1, shelf: 1 }) },
    ];

    // Verify natural order
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i].order).toBeGreaterThan(orders[i - 1].order);
    }
  });
});

describe('isValidLocation', () => {
  it('should validate correct formats', () => {
    expect(isValidLocation('A1-R2-S3')).toBe(true);
    expect(isValidLocation('A10-R5-S12')).toBe(true);
    expect(isValidLocation({ aisle: 'A1', row: 'R2', shelf: 'S3' })).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidLocation(null)).toBe(false);
    expect(isValidLocation('')).toBe(false);
    expect(isValidLocation('invalid')).toBe(false);
    expect(isValidLocation('A1-R2')).toBe(false);
  });

  it('should reject out-of-range values', () => {
    expect(isValidLocation('A1000-R2-S3')).toBe(false);
    expect(isValidLocation('A1-R100-S3')).toBe(false);
    expect(isValidLocation('A1-R2-S100')).toBe(false);
  });
});

describe('formatLocation', () => {
  it('should format location components correctly', () => {
    expect(formatLocation({ aisle: 1, row: 2, shelf: 3 })).toBe('A1-R2-S3');
    expect(formatLocation({ aisle: 10, row: 5, shelf: 12 })).toBe('A10-R5-S12');
    expect(formatLocation({ aisle: 0, row: 0, shelf: 0 })).toBe('A0-R0-S0');
  });
});

describe('Integration tests', () => {
  it('should handle full workflow: parse -> calculate -> format', () => {
    const input = 'Aisle 5, Row 10, Shelf 3';
    const parsed = parseLocation(input);

    expect(parsed.success).toBe(true);
    expect(parsed.pickOrder).toBe(51003);

    if (parsed.components) {
      const formatted = formatLocation(parsed.components);
      expect(formatted).toBe('A5-R10-S3');

      const recalculated = calculatePickOrder(parsed.components);
      expect(recalculated).toBe(parsed.pickOrder);
    }
  });

  it('should handle batch processing of locations', () => {
    const locations = [
      'A1-R1-S1',
      'A1-R1-S2',
      'A1-R2-S1',
      'A2-R1-S1',
    ];

    const results = locations.map(loc => parseLocation(loc));

    expect(results.every(r => r.success)).toBe(true);

    const pickOrders = results.map(r => r.pickOrder!);

    // Verify they're in ascending order
    for (let i = 1; i < pickOrders.length; i++) {
      expect(pickOrders[i]).toBeGreaterThan(pickOrders[i - 1]);
    }
  });
});
