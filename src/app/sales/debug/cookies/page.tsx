"use client";

import { useEffect, useState } from "react";

export default function CookieDebugPage() {
  const [cookies, setCookies] = useState<Record<string, string>>({});
  const [apiTest, setApiTest] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Parse cookies from document.cookie
    const parsedCookies: Record<string, string> = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name) {
        parsedCookies[name] = value || '';
      }
    });
    setCookies(parsedCookies);

    // Test API call
    fetch("/api/sales/auth/me", {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => setApiTest(data))
      .catch(err => setApiError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Cookie Debug Tool</h1>
          <p className="text-gray-600 mb-4">
            This page shows all cookies the browser has for this domain.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Browser Cookies</h2>
          {Object.keys(cookies).length === 0 ? (
            <p className="text-red-600">❌ No cookies found in browser!</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(cookies).map(([name, value]) => (
                <div key={name} className="flex items-start gap-4 p-3 bg-gray-50 rounded">
                  <div className="font-mono text-sm font-semibold text-blue-600 min-w-[200px]">
                    {name}
                  </div>
                  <div className="font-mono text-sm text-gray-700 break-all">
                    {value.substring(0, 50)}
                    {value.length > 50 && '...'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">API Test: /api/sales/auth/me</h2>
          {apiError ? (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-700">❌ Error: {apiError}</p>
            </div>
          ) : apiTest ? (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-700 font-semibold mb-2">✅ Success!</p>
              <pre className="text-sm text-gray-700 overflow-x-auto">
                {JSON.stringify(apiTest, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-gray-500">Loading...</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Expected Cookies</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li><code className="bg-gray-100 px-2 py-1 rounded">sales_session_id</code> - Session ID cookie</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">sales_refresh_token</code> - Refresh token cookie</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = "/sales/login"}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Go to Login Page
            </button>
            <button
              onClick={() => window.location.reload()}
              className="ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
