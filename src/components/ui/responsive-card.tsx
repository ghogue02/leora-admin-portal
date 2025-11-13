import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted";
}

export const ResponsiveCard = React.forwardRef<HTMLDivElement, ResponsiveCardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClass =
      variant === "muted"
        ? "border border-dashed border-gray-300 bg-gray-50"
        : "surface-card shadow-sm";

    return (
      <div ref={ref} className={cn("rounded-xl p-4", variantClass, className)} {...props} />
    );
  },
);
ResponsiveCard.displayName = "ResponsiveCard";

interface ResponsiveCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ResponsiveCardHeader = React.forwardRef<HTMLDivElement, ResponsiveCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mb-3 flex flex-col gap-1", className)} {...props} />
  ),
);
ResponsiveCardHeader.displayName = "ResponsiveCardHeader";

interface ResponsiveCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const ResponsiveCardTitle = React.forwardRef<
  HTMLHeadingElement,
  ResponsiveCardTitleProps
>(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold text-gray-900", className)} {...props} />
));
ResponsiveCardTitle.displayName = "ResponsiveCardTitle";

interface ResponsiveCardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const ResponsiveCardDescription = React.forwardRef<
  HTMLParagraphElement,
  ResponsiveCardDescriptionProps
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-gray-600", className)} {...props} />
));
ResponsiveCardDescription.displayName = "ResponsiveCardDescription";
