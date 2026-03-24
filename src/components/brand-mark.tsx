"use client";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  showBadge?: boolean;
  className?: string;
}

const badgeSizeByVariant: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
};

const textSizeByVariant: Record<NonNullable<BrandMarkProps["size"]>, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
};

export function BrandMark({
  size = "md",
  showName = true,
  showBadge = false,
  className,
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showBadge && (
        <div
          aria-hidden="true"
          className={cn(
            "flex items-center justify-center rounded-xl border border-brand-border bg-brand-surface font-display font-bold text-brand-text shadow-sm",
            badgeSizeByVariant[size]
          )}
        >
          V
        </div>
      )}
      {showName && (
        <span className={cn("font-display font-semibold tracking-tight text-brand-text", textSizeByVariant[size])}>
          Vysen
        </span>
      )}
    </div>
  );
}
