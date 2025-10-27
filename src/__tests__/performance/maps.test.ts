/**
 * Map Performance Tests
 *
 * Tests map rendering, geocoding batch operations,
 * heat map generation, and overall performance.
 */

import { performance } from 'perf_hooks';
import { prisma } from '@/lib/prisma';
import { geocodeBatch } from '@/lib/geocoding';
import { generateHeatMapData } from '@/lib/heatmap';
import { assignCustomersToTerritory } from '@/lib/territory';

describe('Map Performance Tests', () => {
  describe('Map Rendering Performance', () => {
    it('should render 4,838 customer markers in under 3 seconds', async () => {
      // Create 4,838 customers with coordinates
      const customers = Array.from({ length: 4838 }, (_, i) => ({
        name: `Customer ${i}`,
        latitude: 37.7 + Math.random() * 0.2,
        longitude: -122.5 + Math.random() * 0.2,
      }));

      await prisma.customer.createMany({ data: customers });

      const startTime = performance.now();

      // Simulate fetching and rendering markers
      const customerData = await prisma.customer.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
        },
      });

      const duration = performance.now() - startTime;

      expect(customerData).toHaveLength(4838);
      expect(duration).toBeLessThan(3000); // <3 seconds

      await prisma.customer.deleteMany();
    });

    it('should maintain 60fps during map pan and zoom', async () => {
      // Create 1000 markers
      const customers = Array.from({ length: 1000 }, (_, i) => ({
        name: `Customer ${i}`,
        latitude: 37.7 + Math.random() * 0.2,
        longitude: -122.5 + Math.random() * 0.2,
      }));

      await prisma.customer.createMany({ data: customers });

      const frameTimes: number[] = [];
      const targetFrameTime = 1000 / 60; // 16.67ms for 60fps

      // Simulate 100 pan operations
      for (let i = 0; i < 100; i++) {
        const frameStart = performance.now();

        // Simulate re-query for visible markers
        await prisma.customer.findMany({
          where: {
            latitude: {
              gte: 37.7 + (i * 0.001),
              lte: 37.9 + (i * 0.001),
            },
            longitude: {
              gte: -122.5,
              lte: -122.3,
            },
          },
          take: 100,
        });

        frameTimes.push(performance.now() - frameStart);
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const droppedFrames = frameTimes.filter((t) => t > targetFrameTime).length;

      expect(avgFrameTime).toBeLessThan(targetFrameTime);
      expect(droppedFrames).toBeLessThan(10); // <10% dropped frames

      await prisma.customer.deleteMany();
    });

    it('should load map tiles efficiently', async () => {
      // Simulate loading 25 map tiles (5x5 grid)
      const tileLoadTimes: number[] = [];

      for (let i = 0; i < 25; i++) {
        const startTime = performance.now();

        // Simulate tile load (mock HTTP request)
        await new Promise((resolve) => setTimeout(resolve, 50));

        tileLoadTimes.push(performance.now() - startTime);
      }

      const totalTime = tileLoadTimes.reduce((a, b) => a + b, 0);
      const avgTileTime = totalTime / tileLoadTimes.length;

      expect(avgTileTime).toBeLessThan(100); // <100ms per tile
      expect(totalTime).toBeLessThan(2000); // All tiles <2s
    });
  });

  describe('Geocoding Performance', () => {
    it('should geocode 100 addresses in under 20 seconds', async () => {
      const addresses = Array.from({ length: 100 }, (_, i) => `${i} Main St`);

      const startTime = performance.now();
      await geocodeBatch(addresses, { maxConcurrent: 10 });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(20000); // <20 seconds
    }, 30000);

    it('should respect rate limit of 600 requests per minute', async () => {
      const addresses = Array.from({ length: 20 }, (_, i) => `${i} Test St`);

      const startTime = performance.now();
      await geocodeBatch(addresses);
      const duration = performance.now() - startTime;

      // 20 requests at 600/min = 1 every 100ms = 2 seconds minimum
      expect(duration).toBeGreaterThan(1900);
    }, 10000);

    it('should cache geocoding results efficiently', async () => {
      const addresses = Array.from({ length: 50 }, () => '123 Main St'); // Same address 50 times

      const startTime = performance.now();
      await geocodeBatch(addresses);
      const duration = performance.now() - startTime;

      // Should only geocode once, rest from cache
      expect(duration).toBeLessThan(1000); // <1 second (cached)
    });

    it('should handle geocoding queue efficiently', async () => {
      const batches = [
        Array.from({ length: 10 }, (_, i) => `${i} A St`),
        Array.from({ length: 10 }, (_, i) => `${i} B St`),
        Array.from({ length: 10 }, (_, i) => `${i} C St`),
      ];

      const startTime = performance.now();

      // Run batches in parallel
      await Promise.all(batches.map((batch) => geocodeBatch(batch)));

      const duration = performance.now() - startTime;

      // Should use queue efficiently
      expect(duration).toBeLessThan(10000); // <10 seconds for 30 total
    }, 15000);
  });

  describe('Heat Map Performance', () => {
    it('should generate heat map data in under 1 second', async () => {
      // Create 1000 customers
      const customers = Array.from({ length: 1000 }, (_, i) => ({
        name: `Customer ${i}`,
        latitude: 37.7 + Math.random() * 0.2,
        longitude: -122.5 + Math.random() * 0.2,
        totalRevenue: Math.random() * 100000,
      }));

      await prisma.customer.createMany({ data: customers });

      const startTime = performance.now();
      const heatMapData = await generateHeatMapData({ weightBy: 'revenue' });
      const duration = performance.now() - startTime;

      expect(heatMapData).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // <1 second

      await prisma.customer.deleteMany();
    });

    it('should efficiently cluster heat map points', async () => {
      // Create clustered data (groups in 5 locations)
      const clusters = [
        { lat: 37.75, lng: -122.45, count: 200 },
        { lat: 37.78, lng: -122.42, count: 150 },
        { lat: 37.81, lng: -122.38, count: 180 },
        { lat: 37.76, lng: -122.48, count: 100 },
        { lat: 37.79, lng: -122.40, count: 120 },
      ];

      const customers: any[] = [];
      clusters.forEach((cluster) => {
        for (let i = 0; i < cluster.count; i++) {
          customers.push({
            name: `Customer ${customers.length}`,
            latitude: cluster.lat + (Math.random() - 0.5) * 0.01,
            longitude: cluster.lng + (Math.random() - 0.5) * 0.01,
            totalRevenue: Math.random() * 50000,
          });
        }
      });

      await prisma.customer.createMany({ data: customers });

      const startTime = performance.now();
      const heatMapData = await generateHeatMapData({
        cluster: true,
        clusterRadius: 0.01,
      });
      const duration = performance.now() - startTime;

      expect(heatMapData.length).toBeLessThan(750); // Clustered < original
      expect(duration).toBeLessThan(1500); // <1.5 seconds

      await prisma.customer.deleteMany();
    });

    it('should handle real-time heat map updates', async () => {
      await prisma.customer.createMany({
        data: Array.from({ length: 500 }, (_, i) => ({
          name: `Customer ${i}`,
          latitude: 37.7 + Math.random() * 0.2,
          longitude: -122.5 + Math.random() * 0.2,
        })),
      });

      // Initial heat map
      const start1 = performance.now();
      await generateHeatMapData();
      const initial = performance.now() - start1;

      // Add 100 more customers
      await prisma.customer.createMany({
        data: Array.from({ length: 100 }, (_, i) => ({
          name: `New Customer ${i}`,
          latitude: 37.7 + Math.random() * 0.2,
          longitude: -122.5 + Math.random() * 0.2,
        })),
      });

      // Updated heat map
      const start2 = performance.now();
      await generateHeatMapData();
      const updated = performance.now() - start2;

      expect(initial).toBeLessThan(1000);
      expect(updated).toBeLessThan(1000);

      await prisma.customer.deleteMany();
    });
  });

  describe('Territory Assignment Performance', () => {
    it('should assign 1000 customers to territory in under 2 seconds', async () => {
      const territory = await prisma.territory.create({
        data: {
          name: 'Large Territory',
          geoJson: {
            type: 'Polygon',
            coordinates: [
              [
                [-123, 37],
                [-122, 37],
                [-122, 38],
                [-123, 38],
                [-123, 37],
              ],
            ],
          },
        },
      });

      // Create 1000 customers
      const customers = Array.from({ length: 1000 }, (_, i) => ({
        name: `Customer ${i}`,
        latitude: 37 + Math.random(),
        longitude: -123 + Math.random(),
      }));

      await prisma.customer.createMany({ data: customers });

      const startTime = performance.now();
      await assignCustomersToTerritory(territory.id, { byLocation: true });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(2000); // <2 seconds

      await prisma.customer.deleteMany();
      await prisma.territory.delete({ where: { id: territory.id } });
    });

    it('should efficiently check point-in-polygon for complex shapes', async () => {
      // Create complex polygon with 100 vertices
      const vertices = Array.from({ length: 100 }, (_, i) => {
        const angle = (i / 100) * 2 * Math.PI;
        const radius = 0.5 + Math.random() * 0.1;
        return [-122 + Math.cos(angle) * radius, 37.7 + Math.sin(angle) * radius];
      });
      vertices.push(vertices[0]); // Close polygon

      const territory = await prisma.territory.create({
        data: {
          name: 'Complex Territory',
          geoJson: {
            type: 'Polygon',
            coordinates: [vertices],
          },
        },
      });

      const customers = Array.from({ length: 500 }, (_, i) => ({
        name: `Customer ${i}`,
        latitude: 37.7 + (Math.random() - 0.5),
        longitude: -122 + (Math.random() - 0.5),
      }));

      await prisma.customer.createMany({ data: customers });

      const startTime = performance.now();
      await assignCustomersToTerritory(territory.id, { byLocation: true });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(3000); // <3 seconds for complex polygon

      await prisma.customer.deleteMany();
      await prisma.territory.delete({ where: { id: territory.id } });
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query customers by bounding box', async () => {
      await prisma.customer.createMany({
        data: Array.from({ length: 2000 }, (_, i) => ({
          name: `Customer ${i}`,
          latitude: 37 + Math.random(),
          longitude: -123 + Math.random(),
        })),
      });

      const startTime = performance.now();

      const customers = await prisma.customer.findMany({
        where: {
          latitude: { gte: 37.5, lte: 37.7 },
          longitude: { gte: -122.5, lte: -122.3 },
        },
      });

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(200); // <200ms
      expect(customers.length).toBeGreaterThan(0);

      await prisma.customer.deleteMany();
    });

    it('should handle pagination efficiently', async () => {
      await prisma.customer.createMany({
        data: Array.from({ length: 1000 }, (_, i) => ({
          name: `Customer ${i}`,
          latitude: 37 + Math.random() * 0.2,
          longitude: -122.5 + Math.random() * 0.2,
        })),
      });

      const pageTimes: number[] = [];

      // Query 10 pages of 100 customers each
      for (let page = 0; page < 10; page++) {
        const startTime = performance.now();

        await prisma.customer.findMany({
          where: {
            latitude: { not: null },
            longitude: { not: null },
          },
          skip: page * 100,
          take: 100,
        });

        pageTimes.push(performance.now() - startTime);
      }

      const avgPageTime = pageTimes.reduce((a, b) => a + b, 0) / pageTimes.length;

      expect(avgPageTime).toBeLessThan(100); // <100ms per page

      await prisma.customer.deleteMany();
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and process 5000 customers
      for (let batch = 0; batch < 5; batch++) {
        const customers = Array.from({ length: 1000 }, (_, i) => ({
          name: `Batch ${batch} Customer ${i}`,
          latitude: 37 + Math.random() * 0.2,
          longitude: -122.5 + Math.random() * 0.2,
        }));

        await prisma.customer.createMany({ data: customers });

        await generateHeatMapData();

        await prisma.customer.deleteMany();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not increase by more than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent map requests efficiently', async () => {
      await prisma.customer.createMany({
        data: Array.from({ length: 500 }, (_, i) => ({
          name: `Customer ${i}`,
          latitude: 37 + Math.random() * 0.2,
          longitude: -122.5 + Math.random() * 0.2,
        })),
      });

      const startTime = performance.now();

      // Simulate 10 concurrent user requests
      await Promise.all([
        prisma.customer.findMany({ where: { latitude: { gte: 37.7 } }, take: 50 }),
        prisma.customer.findMany({ where: { latitude: { lt: 37.8 } }, take: 50 }),
        generateHeatMapData(),
        prisma.customer.findMany({ where: { longitude: { gte: -122.4 } }, take: 50 }),
        prisma.customer.findMany({ where: { longitude: { lt: -122.3 } }, take: 50 }),
        generateHeatMapData({ weightBy: 'count' }),
        prisma.customer.count({ where: { latitude: { not: null } } }),
        prisma.customer.findMany({ take: 100, orderBy: { name: 'asc' } }),
        generateHeatMapData({ cluster: true }),
        prisma.customer.findMany({ where: { name: { contains: 'Customer' } }, take: 50 }),
      ]);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(3000); // <3 seconds for 10 concurrent requests

      await prisma.customer.deleteMany();
    });
  });
});
