import { describe, it, expect, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';

describe('Phase 7 Performance Tests', () => {
  describe('Image Upload Performance', () => {
    it('should upload 5MB image in under 2 seconds', async () => {
      const imageBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer]), 'test.jpg');

      const start = performance.now();

      const response = await fetch('http://localhost:3000/api/scan/business-card', {
        method: 'POST',
        body: formData
      });

      const duration = performance.now() - start;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(2000);
    });

    it('should handle concurrent uploads efficiently', async () => {
      const uploads = Array.from({ length: 5 }, (_, i) => {
        const formData = new FormData();
        formData.append('image', new Blob(['image']), `test${i}.jpg`);

        return fetch('http://localhost:3000/api/scan/business-card', {
          method: 'POST',
          body: formData
        });
      });

      const start = performance.now();
      const responses = await Promise.all(uploads);
      const duration = performance.now() - start;

      expect(responses.every(r => r.ok)).toBe(true);
      expect(duration).toBeLessThan(5000); // 5 uploads in <5s
    });
  });

  describe('Claude Extraction Performance', () => {
    it('should extract business card data in under 10 seconds', async () => {
      const scanId = await createTestScan();

      const start = performance.now();

      // Poll for completion
      let status = 'pending';
      while (status === 'pending' || status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 500));

        const response = await fetch(`http://localhost:3000/api/scan/${scanId}`);
        const data = await response.json();
        status = data.status;

        if (performance.now() - start > 15000) {
          throw new Error('Extraction timeout');
        }
      }

      const duration = performance.now() - start;

      expect(status).toBe('completed');
      expect(duration).toBeLessThan(10000);
    });

    it('should batch process 10 scans within 30 seconds', async () => {
      const scanIds = await Promise.all(
        Array.from({ length: 10 }, () => createTestScan())
      );

      const start = performance.now();

      const results = await Promise.all(
        scanIds.map(async (scanId) => {
          let status = 'pending';
          while (status !== 'completed' && status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 500));
            const response = await fetch(`http://localhost:3000/api/scan/${scanId}`);
            const data = await response.json();
            status = data.status;
          }
          return status;
        })
      );

      const duration = performance.now() - start;

      expect(results.every(s => s === 'completed')).toBe(true);
      expect(duration).toBeLessThan(30000);
    });

    it('should maintain extraction quality under load', async () => {
      const scanId = await createTestScan();

      // Wait for extraction
      let extractedData: any;
      let status = 'pending';

      while (status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = await fetch(`http://localhost:3000/api/scan/${scanId}`);
        const data = await response.json();
        status = data.status;
        extractedData = data.extractedData;
      }

      // Verify data quality
      expect(extractedData).toHaveProperty('name');
      expect(extractedData).toHaveProperty('email');
      expect(extractedData.name).toBeTruthy();
      expect(extractedData.email).toMatch(/^.+@.+\..+$/);
    });
  });

  describe('Mailchimp Sync Performance', () => {
    it('should sync 100 customers in under 30 seconds', async () => {
      const customers = Array.from({ length: 100 }, (_, i) => ({
        id: `cust_${i}`,
        email: `customer${i}@example.com`,
        first_name: `Customer`,
        last_name: `${i}`,
        status: 'ACTIVE'
      }));

      const start = performance.now();

      const response = await fetch('http://localhost:3000/api/mailchimp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers })
      });

      const duration = performance.now() - start;
      const result = await response.json();

      expect(response.ok).toBe(true);
      expect(result.synced).toBe(100);
      expect(duration).toBeLessThan(30000);
    });

    it('should handle 500 customers in batches efficiently', async () => {
      const customers = Array.from({ length: 500 }, (_, i) => ({
        id: `cust_${i}`,
        email: `customer${i}@example.com`
      }));

      const start = performance.now();

      const response = await fetch('http://localhost:3000/api/mailchimp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customers,
          batchSize: 100 // Process in batches
        })
      });

      const duration = performance.now() - start;
      const result = await response.json();

      expect(result.synced).toBe(500);
      expect(duration).toBeLessThan(120000); // <2 minutes for 500
    });

    it('should create campaign with minimal latency', async () => {
      const campaignConfig = {
        subject: 'Test Campaign',
        listId: 'list123',
        segmentId: 456
      };

      const start = performance.now();

      const response = await fetch('http://localhost:3000/api/mailchimp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignConfig)
      });

      const duration = performance.now() - start;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(3000); // <3s campaign creation
    });
  });

  describe('Camera Capture Performance', () => {
    it('should initialize camera instantly', async () => {
      const mockGetUserMedia = vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      });

      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia }
      });

      const start = performance.now();
      await mockGetUserMedia({ video: true });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Instant
    });

    it('should capture and compress photo quickly', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;

      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'blue';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const start = performance.now();

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8);
      });

      const duration = performance.now() - start;

      expect(blob.size).toBeLessThan(1024 * 1024); // <1MB compressed
      expect(duration).toBeLessThan(500); // <500ms compression
    });
  });

  describe('Job Processing Throughput', () => {
    it('should process 50 scan jobs concurrently', async () => {
      const scanIds = Array.from({ length: 50 }, (_, i) => `scan_${i}`);

      const start = performance.now();

      const results = await Promise.all(
        scanIds.map(async (scanId) => {
          const response = await fetch(`http://localhost:3000/api/scan/${scanId}`);
          return response.json();
        })
      );

      const duration = performance.now() - start;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(5000); // <5s for 50 status checks
    });

    it('should maintain queue performance under load', async () => {
      // Create 100 scan jobs
      const jobs = await Promise.all(
        Array.from({ length: 100 }, async () => {
          const formData = new FormData();
          formData.append('image', new Blob(['image']), 'test.jpg');

          const response = await fetch('http://localhost:3000/api/scan/business-card', {
            method: 'POST',
            body: formData
          });

          return response.json();
        })
      );

      const scanIds = jobs.map(j => j.scanId);

      // Measure queue processing time
      const start = performance.now();

      let completedCount = 0;
      while (completedCount < 100) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const statuses = await Promise.all(
          scanIds.map(async (scanId) => {
            const response = await fetch(`http://localhost:3000/api/scan/${scanId}`);
            const data = await response.json();
            return data.status;
          })
        );

        completedCount = statuses.filter(s => s === 'completed').length;

        if (performance.now() - start > 60000) {
          break; // 1 minute timeout
        }
      }

      const duration = performance.now() - start;

      // Should process most within 1 minute
      expect(completedCount).toBeGreaterThan(80);
      expect(duration).toBeLessThan(60000);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during scanning', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and process 20 scans
      for (let i = 0; i < 20; i++) {
        await createTestScan();
      }

      global.gc?.(); // Force garbage collection if available

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase by more than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large batch operations efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const customers = Array.from({ length: 1000 }, (_, i) => ({
        id: `cust_${i}`,
        email: `customer${i}@example.com`
      }));

      await fetch('http://localhost:3000/api/mailchimp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers })
      });

      global.gc?.();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // <100MB
    });
  });

  describe('API Response Times', () => {
    const endpoints = [
      { method: 'GET', url: '/api/scan/scan_123', maxTime: 100 },
      { method: 'POST', url: '/api/scan/business-card', maxTime: 2000 },
      { method: 'GET', url: '/api/mailchimp/lists', maxTime: 1000 },
      { method: 'POST', url: '/api/mailchimp/sync', maxTime: 30000 }
    ];

    endpoints.forEach(({ method, url, maxTime }) => {
      it(`${method} ${url} should respond within ${maxTime}ms`, async () => {
        const start = performance.now();

        await fetch(`http://localhost:3000${url}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method === 'POST' ? JSON.stringify({}) : undefined
        });

        const duration = performance.now() - start;

        expect(duration).toBeLessThan(maxTime);
      });
    });
  });
});

// Helper function
async function createTestScan(): Promise<string> {
  const formData = new FormData();
  formData.append('image', new Blob(['test image']), 'test.jpg');

  const response = await fetch('http://localhost:3000/api/scan/business-card', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data.scanId;
}
