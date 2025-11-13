"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ResponsiveChartRenderProps = {
  width: number;
  height: number;
  isCompact: boolean;
};

type ResponsiveChartContainerProps = {
  minHeight?: number;
  className?: string;
  children: (context: ResponsiveChartRenderProps) => React.ReactNode;
};

export function ResponsiveChartContainer({
  minHeight = 260,
  className,
  children,
}: ResponsiveChartContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: minHeight });

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    const element = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = entry.contentRect.width;
      const nextHeight = Math.max(minHeight, Math.round(nextWidth * 0.6));
      setSize({ width: nextWidth, height: nextHeight });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [minHeight]);

  const isReady = size.width > 0;
  const isCompact = size.width < 640;

  return (
    <div ref={containerRef} className={cn("w-full", className)} style={{ minHeight }}>
      {isReady ? (
        <div style={{ width: "100%", height: size.height }}>
          {children({ width: size.width, height: size.height, isCompact })}
        </div>
      ) : (
        <div style={{ width: "100%", height: minHeight }} />
      )}
    </div>
  );
}
