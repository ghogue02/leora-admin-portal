'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type ToastTone = "info" | "success" | "warning" | "error";

type ToastPayload = {
  tone?: ToastTone;
  title: string;
  description?: string;
  timeoutMs?: number;
};

type ToastContextValue = {
  pushToast: (toast: ToastPayload) => void;
};

type ActiveToast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  timeoutMs: number;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: ToastPayload) => {
      const id = counterRef.current + 1;
      counterRef.current = id;
      const tone: ToastTone = toast.tone ?? "info";
      const timeoutMs = toast.timeoutMs ?? 6000;

      setToasts((current) => [
        ...current,
        {
          id,
          tone,
          title: toast.title,
          description: toast.description,
          timeoutMs,
        },
      ]);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast,
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createElement(ToastViewport, { toasts, removeToast })}
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  removeToast,
}: {
  toasts: ActiveToast[];
  removeToast: (id: number) => void;
}) {
  useEffect(() => {
    const timers = toasts.map((toast) => {
      return window.setTimeout(() => {
        removeToast(toast.id);
      }, toast.timeoutMs);
    });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex flex-col gap-3 sm:inset-x-auto sm:right-6 sm:w-96"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ActiveToast; onDismiss: (id: number) => void }) {
  const toneStyles = toneStyle(toast.tone);
  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-md border px-4 py-3 shadow-lg backdrop-blur ${toneStyles.container}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${toneStyles.title}`}>{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-xs text-gray-600">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-xs font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-800"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function toneStyle(tone: ToastTone) {
  switch (tone) {
    case "success":
      return {
        container: "border-emerald-200 bg-emerald-50/95",
        title: "text-emerald-900",
      };
    case "warning":
      return {
        container: "border-amber-200 bg-amber-50/95",
        title: "text-amber-900",
      };
    case "error":
      return {
        container: "border-rose-200 bg-rose-50/95",
        title: "text-rose-900",
      };
    default:
      return {
        container: "border-slate-200 bg-white/95",
        title: "text-gray-900",
      };
  }
}
