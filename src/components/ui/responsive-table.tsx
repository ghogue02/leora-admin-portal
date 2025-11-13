import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  stickyHeader?: boolean;
}

export const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, stickyHeader = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "not-prose overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm",
        stickyHeader && "[&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
ResponsiveTable.displayName = "ResponsiveTable";
