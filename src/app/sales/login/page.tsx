'use client';

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalesLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "checking">("checking");
  const [error, setError] = useState<string | null>(null);

  // Check if already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Add timeout to prevent infinite loading
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch("/api/sales/auth/me", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Already logged in, redirect to dashboard
          router.replace("/sales/dashboard");
          return;
        }
      } catch (error) {
        // Not logged in or timeout, continue to login form
        console.log("Not authenticated or timeout, showing login form");
      }
      setStatus("idle");
    };

    void checkAuth();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      setStatus("error");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/sales/auth/login", {
        method: "POST",
        credentials: "include", // Important: send and receive cookies
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Slug": process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to authenticate user.");
      }

      setStatus("success");
      void router.push("/sales");
    } catch (err) {
      console.error("Sales login failed:", err);
      const message = err instanceof Error ? err.message : "Unable to authenticate user.";
      setError(message);
      setStatus("error");
    }
  };

  // Show loading while checking authentication
  if (status === "checking") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"></div>
          <p className="mt-4 text-sm text-gray-600">Checking authentication...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Sales Portal</p>
        <h1 className="text-3xl font-semibold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-600">
          Sign in to your sales rep account to access your territory, customers, and sales tools.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <label htmlFor="sales-email" className="block text-xs font-semibold uppercase tracking-widest text-gray-500">
            Email
          </label>
          <input
            id="sales-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="your.email@company.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            required
            autoComplete="email"
            disabled={status === "loading"}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="sales-password"
            className="block text-xs font-semibold uppercase tracking-widest text-gray-500"
          >
            Password
          </label>
          <input
            id="sales-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            required
            autoComplete="current-password"
            disabled={status === "loading"}
          />
        </div>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        ) : null}

        {status === "success" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm text-emerald-700">Login succeeded. Redirecting to dashboard...</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-center">
          <a
            href="/portal"
            className="text-sm font-medium text-gray-600 underline decoration-dotted underline-offset-4 hover:text-gray-900"
          >
            Customer portal
          </a>
        </div>
      </form>
    </main>
  );
}
