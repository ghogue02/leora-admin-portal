/**
 * LOVABLE MIGRATION - Login Page Component
 *
 * Simplified login page for sales rep authentication
 * Original: /src/app/sales/login/page.tsx
 */

'use client';

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Button, Alert } from "@/components/ui/ui-components";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "checking">("checking");
  const [error, setError] = useState<string | null>(null);

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/sales/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          router.replace("/sales/dashboard");
          return;
        }
      } catch (error) {
        console.log("Not authenticated");
      }
      setStatus("idle");
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email is required");
      setStatus("error");
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/sales/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to authenticate");
      }

      setStatus("success");
      router.push("/sales/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setStatus("error");
    }
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sales Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your territory and customers
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              required
              autoComplete="email"
              disabled={status === "loading"}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={status === "loading"}
            />

            {error && (
              <Alert variant="danger" title="Login Failed">
                {error}
              </Alert>
            )}

            {status === "success" && (
              <Alert variant="success">
                Login successful! Redirecting to dashboard...
              </Alert>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <a
              href="/portal"
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Customer Portal →
            </a>
          </div>
        </div>

        {/* Demo Credentials */}
        {process.env.NODE_ENV === 'development' && (
          <Alert variant="info" title="Demo Credentials">
            <p>Email: rep@demo.com</p>
            <p>Password: password123</p>
          </Alert>
        )}
      </div>
    </div>
  );
}
