import React, { useState } from 'react';
import { DashboardTile } from './DashboardTile';

/**
 * Usage Examples for DashboardTile Component
 */

// Example 1: Basic Usage with Existing Tile Content
export const BasicExample = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <DashboardTile
      drilldownType="at-risk-cadence"
      title="At Risk Customers"
      onClick={() => setShowModal(true)}
    >
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">At Risk Customers</h3>
        <p className="text-3xl font-bold text-red-600">24</p>
        <p className="text-sm text-gray-500">Require immediate attention</p>
      </div>
    </DashboardTile>
  );
};

// Example 2: With Custom Click Hint
export const CustomHintExample = () => {
  return (
    <DashboardTile
      drilldownType="revenue"
      title="Monthly Revenue"
      onClick={() => console.log('Opening revenue drill-down')}
      showClickHint={true}
    >
      <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Monthly Revenue</h3>
        <p className="text-3xl font-bold text-green-600">$125,450</p>
        <p className="text-sm text-gray-600">+12% from last month</p>
      </div>
    </DashboardTile>
  );
};

// Example 3: Non-Interactive Tile (Display Only)
export const NonInteractiveExample = () => {
  return (
    <DashboardTile
      title="Static Information"
      interactive={false}
    >
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Total Users</h3>
        <p className="text-3xl font-bold">1,234</p>
      </div>
    </DashboardTile>
  );
};

// Example 4: Grid Layout with Multiple Tiles
export const GridLayoutExample = () => {
  const handleDrilldown = (type: string) => {
    console.log(`Opening ${type} drill-down`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <DashboardTile
        drilldownType="at-risk-cadence"
        title="At Risk Customers"
        onClick={() => handleDrilldown('at-risk-cadence')}
      >
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">At Risk</h3>
          <p className="text-3xl font-bold text-red-600">24</p>
        </div>
      </DashboardTile>

      <DashboardTile
        drilldownType="active-customers"
        title="Active Customers"
        onClick={() => handleDrilldown('active-customers')}
      >
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Active</h3>
          <p className="text-3xl font-bold text-green-600">156</p>
        </div>
      </DashboardTile>

      <DashboardTile
        drilldownType="new-signups"
        title="New Signups"
        onClick={() => handleDrilldown('new-signups')}
      >
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">New This Month</h3>
          <p className="text-3xl font-bold text-blue-600">32</p>
        </div>
      </DashboardTile>
    </div>
  );
};

// Example 5: Integration with Existing Dashboard Component
export const IntegrationExample = () => {
  const [drilldownType, setDrilldownType] = useState<string | null>(null);

  const openDrilldown = (type: string) => {
    setDrilldownType(type);
  };

  const closeDrilldown = () => {
    setDrilldownType(null);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Customer Health Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* At Risk Customers Tile */}
        <DashboardTile
          drilldownType="at-risk-cadence"
          title="At Risk Customers"
          onClick={() => openDrilldown('at-risk-cadence')}
          className="group"
        >
          <div className="bg-white p-6 rounded-lg border border-gray-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">At Risk Customers</h3>
              <span className="text-red-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-red-600 mb-2">24</p>
            <p className="text-sm text-gray-500">
              Customers requiring immediate attention
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">High Risk:</span>
                <span className="font-semibold text-red-700">12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Medium Risk:</span>
                <span className="font-semibold text-orange-600">12</span>
              </div>
            </div>
          </div>
        </DashboardTile>

        {/* Healthy Customers Tile */}
        <DashboardTile
          drilldownType="healthy-customers"
          title="Healthy Customers"
          onClick={() => openDrilldown('healthy-customers')}
          className="group"
        >
          <div className="bg-white p-6 rounded-lg border border-gray-200 h-full">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">Healthy Customers</h3>
              <span className="text-green-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-green-600 mb-2">156</p>
            <p className="text-sm text-gray-500">
              Active and engaged customers
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">High Engagement:</span>
                <span className="font-semibold text-green-700">89</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Medium Engagement:</span>
                <span className="font-semibold text-green-600">67</span>
              </div>
            </div>
          </div>
        </DashboardTile>
      </div>

      {/* Drill-down Modal */}
      {drilldownType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {drilldownType.split('-').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </h2>
              <button
                onClick={closeDrilldown}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600">
              Detailed view for {drilldownType} would go here...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Example 6: Mobile-Optimized Layout
export const MobileExample = () => {
  return (
    <div className="space-y-4 p-4">
      <DashboardTile
        drilldownType="mobile-metric"
        title="Mobile Metric"
        onClick={() => console.log('Clicked')}
        className="w-full"
      >
        <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[88px] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold mb-1">Mobile Users</h3>
            <p className="text-2xl font-bold text-blue-600">456</p>
          </div>
          <div className="text-blue-500">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
          </div>
        </div>
      </DashboardTile>
    </div>
  );
};

export default {
  BasicExample,
  CustomHintExample,
  NonInteractiveExample,
  GridLayoutExample,
  IntegrationExample,
  MobileExample,
};
