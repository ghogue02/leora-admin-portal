"use client";

import { useState, useEffect } from "react";
import RepManagement from "./sections/RepManagement";
import CustomerAssignment from "./sections/CustomerAssignment";
import ProductGoals from "./sections/ProductGoals";

type TabType = "reps" | "assignments" | "goals" | "incentives" | "budget" | "jobs";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("reps");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check user role
    fetch("/api/sales/auth/me", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const roles = data.user?.roles || [];
        const isAdmin = roles.some(
          (r: { role: { code: string } }) =>
            r.role.code === "sales.admin" || r.role.code === "admin"
        );

        if (!isAdmin) {
          window.location.href = "/sales/dashboard";
          return;
        }

        setUserRole("admin");
        setIsLoading(false);
      })
      .catch(() => {
        window.location.href = "/sales/dashboard";
      });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Administration</h1>
          <p className="mt-2 text-gray-600">
            Manage sales representatives, customer assignments, goals, and incentives
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("reps")}
                className={`${
                  activeTab === "reps"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Sales Representatives
              </button>
              <button
                onClick={() => setActiveTab("assignments")}
                className={`${
                  activeTab === "assignments"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Customer Assignments
              </button>
              <button
                onClick={() => setActiveTab("goals")}
                className={`${
                  activeTab === "goals"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Product Goals
              </button>
              <button
                onClick={() => setActiveTab("incentives")}
                className={`${
                  activeTab === "incentives"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Incentives & Competitions
              </button>
              <button
                onClick={() => setActiveTab("budget")}
                className={`${
                  activeTab === "budget"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Sample Budget
              </button>
              <button
                onClick={() => window.location.href = "/sales/admin/jobs"}
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
              >
                Job Queue
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow-sm rounded-lg">
          {activeTab === "reps" && <RepManagement />}
          {activeTab === "assignments" && <CustomerAssignment />}
          {activeTab === "goals" && <ProductGoals />}
          {activeTab === "incentives" && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Incentives & Competitions</h2>
              <p className="text-gray-600">Feature coming soon...</p>
            </div>
          )}
          {activeTab === "budget" && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Sample Budget Monitoring</h2>
              <p className="text-gray-600">Feature coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
