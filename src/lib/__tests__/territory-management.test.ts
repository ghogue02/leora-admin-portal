/**
 * Territory Management Service Tests
 */

import { describe, it, expect } from 'vitest';
import { isPointInPolygon } from '../territory-management';

describe('Territory Management', () => {
  describe('isPointInPolygon', () => {
    it('should detect point inside polygon', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.3, 37.9],
            [-122.5, 37.9],
            [-122.5, 37.7],
          ],
        ],
      };

      expect(isPointInPolygon(37.8, -122.4, polygon)).toBe(true);
    });

    it('should detect point outside polygon', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.3, 37.9],
            [-122.5, 37.9],
            [-122.5, 37.7],
          ],
        ],
      };

      expect(isPointInPolygon(37.6, -122.4, polygon)).toBe(false);
    });
  });
});
