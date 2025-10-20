'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../_components/ToastProvider";

type CopilotCitation = {
  label: string;
  url?: string;
};

type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CopilotCitation[];
};

type CopilotMetrics = {
  revenueStatus: string;
  paceLabel: string;
  arpddSummary: string;
  atRiskCount: number;
  dueSoonCount: number;
  hotlist: Array<{
    customerId: string;
    name: string | null;
    status: "atRisk" | "dueSoon";
    daysSinceLastOrder: number;
    averagePace: number;
    lateness: number;
  }>;
};

type CopilotStreamEvent =
  | {
      type: "meta";
      metrics: CopilotMetrics;
      followUps: string[];
    }
  | {
      type: "token";
      token: string;
    }
  | {
      type: "done";
      reply: string;
      citations: CopilotCitation[];
      metrics: CopilotMetrics;
      followUps: string[];
      prompts?: { system: string; user: string };
    }
  | {
      type: "error";
      message: string;
    };

const DEFAULT_SUGGESTIONS = [
  "Which customers need attention this week?",
  "What's driving my revenue growth?",
  "Who should I call today?",
  "Show me my top performing products",
  "Which customers are at risk of churning?"
];

export default function SalesLeoraCopilotPage() {
  const { pushToast } = useToast();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasStreamedToken, setHasStreamedToken] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [metrics, setMetrics] = useState<CopilotMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }

      const timestamp = Date.now();
      const userMessage: CopilotMessage = {
        id: `m-${timestamp}-user`,
        role: "user",
        content: trimmed,
      };
      const assistantMessageId = `m-${timestamp}-ai`;

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);
      setInput("");
      setLoading(true);
      setHasStreamedToken(false);

      try {
        // Add debug message
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            ...prev[prev.length - 1],
            content: "🔍 Sending request to OpenAI...",
          },
        ]);

        const response = await fetch("/api/sales/copilot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          const errorMsg = `❌ HTTP ${response.status}: ${body.error ?? response.statusText ?? "Unable to reach Copilot"}`;

          // Show error in chatbox
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              ...prev[prev.length - 1],
              content: errorMsg,
            },
          ]);
          throw new Error(body.error ?? "Unable to reach Copilot right now.");
        }

        // Update debug message
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            ...prev[prev.length - 1],
            content: "🔍 Connected to OpenAI, waiting for response...",
          },
        ]);

        if (!response.body) {
          throw new Error("Copilot stream was empty.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        let streamEnded = false;

        const applyAssistantUpdate = (content: string, citations?: CopilotCitation[]) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content,
                    citations: citations ?? message.citations,
                  }
                : message,
            ),
          );
        };

        const processEvent = (payload: CopilotStreamEvent) => {
          switch (payload.type) {
            case "meta":
              setMetrics(payload.metrics);
              setSuggestions(payload.followUps);
              break;
            case "token":
              assistantContent += payload.token;
              applyAssistantUpdate(assistantContent);
              if (!hasStreamedToken) {
                setHasStreamedToken(true);
              }
              break;
            case "done":
              assistantContent = payload.reply;
              applyAssistantUpdate(payload.reply, payload.citations);
              setMetrics(payload.metrics);
              setSuggestions(payload.followUps);
              setHasStreamedToken(true);
              streamEnded = true;
              break;
            case "error":
              pushToast({
                tone: "error",
                title: "Copilot issue",
                description: payload.message,
              });
              break;
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          if (!value) {
            continue;
          }

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const delimiterIndex = buffer.indexOf("\n\n");
            if (delimiterIndex === -1) {
              break;
            }

            const rawEvent = buffer.slice(0, delimiterIndex).trim();
            buffer = buffer.slice(delimiterIndex + 2);

            if (!rawEvent) {
              continue;
            }

            const dataLines = rawEvent
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .filter(Boolean);

            if (dataLines.length === 0) {
              continue;
            }

            const dataPayload = dataLines.join("");
            if (dataPayload === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(dataPayload) as CopilotStreamEvent;
              processEvent(parsed);
              if (streamEnded) {
                await reader.cancel().catch(() => undefined);
                return;
              }
            } catch (error) {
              console.warn("[copilot] unable to parse event payload", error);
            }
          }
        }
      } catch (error) {
        setMessages((prev) =>
          prev.filter((message) => {
            if (message.id !== assistantMessageId) {
              return true;
            }
            const hasCitations = Boolean(message.citations && message.citations.length > 0);
            const hasContent = message.content.trim().length > 0;
            return hasCitations || hasContent;
          }),
        );

        const message =
          error instanceof Error ? error.message : "Unable to reach Copilot right now.";
        pushToast({
          tone: "error",
          title: "Copilot unavailable",
          description: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [hasStreamedToken, input, pushToast],
  );

  // Load metrics on page load
  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const response = await fetch('/api/sales/dashboard');

      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard data:', data);
        // Transform dashboard data to copilot metrics format
        // The copilot endpoint returns metrics when called, so we'll populate from there
        // For now, set placeholders that will update when user asks a question
        setMetrics({
          revenueStatus: 'Ask a question to see live data',
          paceLabel: 'Ask a question to see live data',
          arpddSummary: 'Ask a question to see live data',
          atRiskCount: 0,
          dueSoonCount: 0,
          hotlist: [],
        });
      } else {
        // If dashboard fails, show friendly message
        setMetrics({
          revenueStatus: 'Ask a question',
          paceLabel: 'Ask a question',
          arpddSummary: 'Ask a question',
          atRiskCount: 0,
          dueSoonCount: 0,
          hotlist: [],
        });
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
      // Set friendly fallback
      setMetrics({
        revenueStatus: 'Ask a question',
        paceLabel: 'Ask a question',
        arpddSummary: 'Ask a question',
        atRiskCount: 0,
        dueSoonCount: 0,
        hotlist: [],
      });
    } finally {
      setLoadingMetrics(false);
    }
  };

  const hotlist = useMemo(() => metrics?.hotlist ?? [], [metrics]);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Auto-submit the question
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">LeorAI</p>
        <h1 className="text-3xl font-semibold text-gray-900">Smart Answers, Fast Action</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Stop digging through spreadsheets. Start asking questions. Which customers need attention this week? What's driving my revenue? Who should I call today? LeorAI connects your sales data with AI to surface the insights that matter—so you can spend less time analyzing and more time selling.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex h-[32rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-gray-600">
                Ask something like "Who's slipping pace this week?" or "How did ARPDD shift vs. last month?"
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[80%] rounded-md border px-3 py-2 text-sm leading-6 ${
                    message.role === "assistant"
                      ? "border-gray-900 bg-gray-900/5 text-gray-900"
                      : "ml-auto border-slate-200 bg-white text-gray-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === "assistant" && message.citations && message.citations.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {message.citations.map((citation, index) => {
                        const key = `${message.id}-citation-${index}`;
                        const baseClasses =
                          "inline-flex items-center rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition";
                        return (
                          <li key={key}>
                            {citation.url ? (
                              <a
                                href={citation.url}
                                className={`${baseClasses} hover:border-gray-400 hover:text-gray-900`}
                              >
                                {citation.label}
                              </a>
                            ) : (
                              <span className={`${baseClasses} cursor-default`}>{citation.label}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </article>
              ))
            )}
            {loading && !hasStreamedToken ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-gray-500">
                Thinking…
              </div>
            ) : null}
          </div>
          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-slate-50 p-4">
            <label className="sr-only" htmlFor="copilot-input">
              Ask Copilot
            </label>
            <div className="flex items-center gap-3">
              <input
                id="copilot-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Leora: 'Who's late on cadence?'"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Live metrics</h2>
              <button
                onClick={fetchMetrics}
                disabled={loadingMetrics}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                title="Refresh metrics"
              >
                {loadingMetrics ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
            <dl className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <dt>Pace</dt>
                <dd className="font-medium">{loadingMetrics ? "..." : (metrics?.paceLabel ?? "—")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Revenue</dt>
                <dd className="font-medium">{loadingMetrics ? "..." : (metrics?.revenueStatus ?? "—")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>ARPDD</dt>
                <dd className="font-medium">{loadingMetrics ? "..." : (metrics?.arpddSummary ?? "—")}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Due soon</dt>
                <dd className="font-medium text-orange-600">{loadingMetrics ? "..." : (metrics?.dueSoonCount ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>At risk</dt>
                <dd className="font-medium text-red-600">{loadingMetrics ? "..." : (metrics?.atRiskCount ?? 0)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Quick Questions</h2>
            <p className="mt-1 text-xs text-gray-500">Click any question to ask LeorAI</p>
            <ul className="mt-3 space-y-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    className="w-full text-left text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md px-3 py-2 transition-colors border border-transparent hover:border-gray-200"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Hotlist snapshot</h2>
            {hotlist.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">No cadence risks identified yet.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-sm text-gray-700">
                {hotlist.map((entry) => (
                  <li key={`${entry.customerId}-${entry.status}`}>
                    <p className="font-medium text-gray-900">{entry.name ?? entry.customerId}</p>
                    <p className="text-xs text-gray-500">
                      {entry.status === "atRisk" ? "At risk" : "Due soon"} · {entry.daysSinceLastOrder} days since last
                      order · pace {entry.averagePace}d
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
