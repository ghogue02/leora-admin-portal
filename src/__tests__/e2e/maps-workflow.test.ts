/**
 * E2E Map Workflow Tests
 *
 * Tests complete user workflows including territory creation,
 * geocoding, and route planning.
 */

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/prisma';

test.describe('E2E Map Workflows', () => {
  test.beforeEach(async () => {
    await prisma.territory.deleteMany();
    await prisma.customer.deleteMany();
  });

  test.describe('Workflow A: Territory Creation', () => {
    test('Manager creates territory and assigns customers', async ({ page }) => {
      // Step 1: Navigate to map page
      await page.goto('/map');
      await expect(page.locator('h1')).toContainText('Customer Map');

      // Step 2: Click "Create Territory" button
      await page.click('button:has-text("Create Territory")');

      // Step 3: Manager draws territory polygon on map
      const map = page.locator('#map-container');
      await map.click({ position: { x: 100, y: 100 } });
      await map.click({ position: { x: 300, y: 100 } });
      await map.click({ position: { x: 300, y: 300 } });
      await map.click({ position: { x: 100, y: 300 } });
      await map.click({ position: { x: 100, y: 100 } }); // Close polygon

      // Step 4: Assign name and color
      await page.fill('input[name="territoryName"]', 'Downtown SF');
      await page.click('input[name="territoryColor"]');
      await page.click('button[data-color="#FF6B6B"]');

      // Step 5: Assign to sales rep
      await page.selectOption('select[name="assignedTo"]', 'user-123');

      // Step 6: Enable auto-assign customers
      await page.check('input[name="autoAssignCustomers"]');

      // Step 7: Save territory
      await page.click('button:has-text("Save Territory")');

      // Step 8: Verify success message
      await expect(page.locator('.toast-success')).toContainText(
        'Territory created successfully'
      );

      // Step 9: Verify customers are auto-assigned
      await page.click(`text=Downtown SF`);
      await expect(page.locator('.territory-customers')).toContainText(
        'Customers:'
      );

      // Step 10: Sales rep sees "My Territory" map
      await page.goto('/map?view=my-territory');
      await expect(page.locator('.territory-name')).toContainText('Downtown SF');
    });

    test('Manager edits existing territory boundaries', async ({ page }) => {
      // Pre-create territory
      const territory = await prisma.territory.create({
        data: {
          name: 'Existing Territory',
          geoJson: {
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
          },
          assignedTo: 'user-123',
        },
      });

      await page.goto('/map');

      // Click on territory
      await page.click(`[data-territory-id="${territory.id}"]`);

      // Click "Edit Territory"
      await page.click('button:has-text("Edit Territory")');

      // Modify boundaries (drag polygon vertex)
      const vertex = page.locator('.polygon-vertex').first();
      await vertex.dragTo(page.locator('#map-container'), {
        targetPosition: { x: 150, y: 150 },
      });

      // Save changes
      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('.toast-success')).toContainText(
        'Territory updated successfully'
      );

      // Verify customers reassigned
      await expect(page.locator('.reassigned-customers')).toBeVisible();
    });
  });

  test.describe('Workflow B: Geocoding Workflow', () => {
    test('User imports CSV and batch geocodes customers', async ({ page }) => {
      // Step 1: Navigate to customers page
      await page.goto('/customers');

      // Step 2: Click "Import Customers"
      await page.click('button:has-text("Import Customers")');

      // Step 3: Upload CSV file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('test-data/customers.csv');

      // Step 4: Map CSV columns
      await page.selectOption('select[name="nameColumn"]', 'Customer Name');
      await page.selectOption('select[name="addressColumn"]', 'Address');
      await page.selectOption('select[name="cityColumn"]', 'City');
      await page.selectOption('select[name="stateColumn"]', 'State');
      await page.selectOption('select[name="zipColumn"]', 'Zip');

      // Step 5: Click "Import"
      await page.click('button:has-text("Import")');

      await expect(page.locator('.toast-success')).toContainText(
        'Imported 100 customers'
      );

      // Step 6: Start batch geocoding
      await page.click('button:has-text("Geocode All")');

      // Step 7: Monitor progress
      const progressBar = page.locator('.geocoding-progress');
      await expect(progressBar).toBeVisible();

      // Step 8: Wait for completion (with timeout)
      await expect(progressBar).toHaveAttribute('aria-valuenow', '100', {
        timeout: 30000,
      });

      await expect(page.locator('.toast-success')).toContainText(
        'Geocoded 100 addresses'
      );

      // Step 9: View customers on map
      await page.goto('/map');

      // Step 10: Verify all customers appear as markers
      const markers = page.locator('.customer-marker');
      await expect(markers).toHaveCount(100);

      // Step 11: Verify heat map updates
      await page.click('button:has-text("Heat Map")');
      const heatMap = page.locator('.mapboxgl-canvas');
      await expect(heatMap).toBeVisible();
    });

    test('User manually geocodes single customer', async ({ page }) => {
      // Create customer without coordinates
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          address: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
        },
      });

      await page.goto(`/customers/${customer.id}`);

      // Click "Geocode Address"
      await page.click('button:has-text("Geocode Address")');

      // Verify geocoding success
      await expect(page.locator('.geocode-status')).toContainText('Success');

      // Verify coordinates displayed
      await expect(page.locator('.customer-latitude')).toContainText('37.');
      await expect(page.locator('.customer-longitude')).toContainText('-122.');

      // Click "View on Map"
      await page.click('button:has-text("View on Map")');

      // Verify redirected to map with marker
      await expect(page).toHaveURL(/\/map\?customerId=/);
      await expect(page.locator('.customer-marker.selected')).toBeVisible();
    });

    test('User handles geocoding failures gracefully', async ({ page }) => {
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          address: 'Invalid Address XYZ',
        },
      });

      await page.goto(`/customers/${customer.id}`);

      await page.click('button:has-text("Geocode Address")');

      // Verify error message
      await expect(page.locator('.geocode-error')).toContainText(
        'Unable to geocode address'
      );

      // User manually enters coordinates
      await page.click('button:has-text("Enter Manually")');
      await page.fill('input[name="latitude"]', '37.7749');
      await page.fill('input[name="longitude"]', '-122.4194');
      await page.click('button:has-text("Save Coordinates")');

      await expect(page.locator('.toast-success')).toContainText(
        'Coordinates saved'
      );
    });
  });

  test.describe('Workflow C: Route Planning Workflow', () => {
    test('Sales rep plans daily route using box selection', async ({ page }) => {
      // Pre-create customers with coordinates
      await prisma.customer.createMany({
        data: Array.from({ length: 20 }, (_, i) => ({
          name: `Customer ${i}`,
          latitude: 37.75 + Math.random() * 0.05,
          longitude: -122.45 + Math.random() * 0.05,
        })),
      });

      // Step 1: Navigate to map
      await page.goto('/map');

      // Step 2: Enable box selection tool
      await page.click('button:has-text("Box Select")');

      // Step 3: Draw selection box on map
      const map = page.locator('#map-container');
      await map.dragTo(map, {
        sourcePosition: { x: 100, y: 100 },
        targetPosition: { x: 300, y: 300 },
      });

      // Step 4: Verify customers selected
      const selectedCustomers = page.locator('.customer-marker.selected');
      await expect(selectedCustomers).toHaveCount(10); // Assumes 10 in box

      // Step 5: Click "Add to Call Plan"
      await page.click('button:has-text("Add to Call Plan")');

      // Step 6: Select date
      await page.fill('input[name="callPlanDate"]', '2024-12-15');

      // Step 7: Click "Optimize Route"
      await page.click('button:has-text("Optimize Route")');

      // Step 8: Verify route displayed on map
      const routeLine = page.locator('.route-line');
      await expect(routeLine).toBeVisible();

      // Step 9: Verify route summary
      await expect(page.locator('.route-summary')).toContainText('10 stops');
      await expect(page.locator('.route-distance')).toContainText('km');

      // Step 10: Export to Azuga
      await page.click('button:has-text("Export to Azuga")');

      await expect(page.locator('.toast-success')).toContainText(
        'Route exported to Azuga'
      );
    });

    test('Sales rep finds nearby customers from current location', async ({ page }) => {
      await prisma.customer.createMany({
        data: [
          { name: 'Nearby 1', latitude: 37.7749, longitude: -122.4194 },
          { name: 'Nearby 2', latitude: 37.7750, longitude: -122.4195 },
          { name: 'Far Away', latitude: 37.8044, longitude: -122.2711 },
        ],
      });

      await page.goto('/map');

      // Click "Find Nearby"
      await page.click('button:has-text("Find Nearby")');

      // Grant location permission (mocked in test)
      await page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: { latitude: 37.7749, longitude: -122.4194 },
          });
        };
      });

      // Select radius
      await page.selectOption('select[name="radius"]', '1'); // 1 km

      // Click "Search"
      await page.click('button:has-text("Search")');

      // Verify results
      const results = page.locator('.nearby-customer');
      await expect(results).toHaveCount(2);

      // Verify sorted by distance
      await expect(results.first()).toContainText('Nearby 1');

      // Add to call plan
      await results.first().click();
      await page.click('button:has-text("Add to Call Plan")');

      await expect(page.locator('.toast-success')).toContainText(
        'Added to call plan'
      );
    });
  });

  test.describe('Mobile Map Usage', () => {
    test('Sales rep uses map on mobile device', async ({ page, context }) => {
      // Emulate mobile device
      await context.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
      await page.setViewportSize({ width: 375, height: 667 });

      await prisma.customer.create({
        data: {
          name: 'Test Customer',
          latitude: 37.7750,
          longitude: -122.4195,
        },
      });

      await page.goto('/map');

      // Verify mobile layout
      await expect(page.locator('.mobile-map-view')).toBeVisible();

      // Tap customer marker
      await page.tap('.customer-marker');

      // Verify customer card shown
      await expect(page.locator('.customer-card')).toBeVisible();
      await expect(page.locator('.customer-card')).toContainText('Test Customer');

      // Tap "Get Directions"
      await page.tap('button:has-text("Get Directions")');

      // Verify opens native maps app (mocked)
      await expect(page).toHaveURL(/maps.google.com|maps.apple.com/);
    });
  });

  test.describe('Territory Performance Tracking', () => {
    test('Manager views territory metrics', async ({ page }) => {
      const territory = await prisma.territory.create({
        data: {
          name: 'Test Territory',
          geoJson: {
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
          },
          assignedTo: 'user-123',
        },
      });

      await prisma.customer.createMany({
        data: [
          { name: 'C1', territoryId: territory.id, totalRevenue: 50000, status: 'active' },
          { name: 'C2', territoryId: territory.id, totalRevenue: 75000, status: 'active' },
          { name: 'C3', territoryId: territory.id, totalRevenue: 25000, status: 'inactive' },
        ],
      });

      await page.goto('/territories');

      // Click on territory
      await page.click(`text=${territory.name}`);

      // Verify metrics displayed
      await expect(page.locator('.territory-customers')).toContainText('3');
      await expect(page.locator('.territory-revenue')).toContainText('$150,000');
      await expect(page.locator('.territory-active-rate')).toContainText('66.7%');

      // View on map
      await page.click('button:has-text("View on Map")');

      // Verify territory highlighted
      await expect(page.locator('.territory-polygon.selected')).toBeVisible();
    });
  });
});
