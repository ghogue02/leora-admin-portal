'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_EMAIL =
  process.env.NEXT_PUBLIC_DEFAULT_PORTAL_USER_EMAIL ??
  process.env.DEFAULT_PORTAL_USER_EMAIL ??
  "demo@example.dev";

export default function PortalLoginHelper() {
  const router = useRouter();
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [fullName, setFullName] = useState("");
  const [portalKey, setPortalKey] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Slug": process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted",
        },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          portalUserKey: portalKey.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to authenticate user.");
      }

      setStatus("success");
      void router.push("/portal/leora");
    } catch (err) {
      console.error("Portal login failed:", err);
      const message = err instanceof Error ? err.message : "Unable to authenticate user.";
      setError(message);
      setStatus("error");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Developer tools</p>
        <h1 className="text-3xl font-semibold text-gray-900">Portal login helper</h1>
        <p className="text-sm text-gray-600">
          Use this utility to create a portal session cookie for local development without touching Postman
          or curl. Once authenticated you&apos;ll be redirected to Copilot.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <label htmlFor="helper-email" className="block text-xs font-semibold uppercase tracking-widest text-gray-500">
            Email
          </label>
          <input
            id="helper-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="demo@example.dev"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            required
            autoComplete="email"
          />
          <p className="text-xs text-gray-500">
            Use any portal user email that exists in the seeded dataset (local environments already run the seeder).
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="helper-full-name"
            className="block text-xs font-semibold uppercase tracking-widest text-gray-500"
          >
            Full name
          </label>
          <input
            id="helper-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Optional override"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="helper-portal-key"
            className="block text-xs font-semibold uppercase tracking-widest text-gray-500"
          >
            Portal user key
          </label>
          <input
            id="helper-portal-key"
            value={portalKey}
            onChange={(event) => setPortalKey(event.target.value)}
            placeholder="Optional unless first-time login requires it"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            autoComplete="off"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {status === "success" ? (
          <p className="text-sm text-emerald-600">Login succeeded. Redirecting…</p>
        ) : null}

        <div className="flex items-center justify-between">
          <a
            href="/portal/leora"
            className="text-sm font-medium text-gray-600 underline decoration-dotted underline-offset-4 hover:text-gray-900"
          >
            Skip to Copilot
          </a>
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Signing in…" : "Create session"}
          </button>
        </div>
      </form>
    </main>
  );
}
