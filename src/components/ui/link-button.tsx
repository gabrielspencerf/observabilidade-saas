"use client";

import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  default:
    "btn-cta-primary focus-visible:ring-brand-neon focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark disabled:opacity-50 transition-all duration-200",
  outline:
    "btn-outline focus-visible:ring-brand-muted focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark disabled:opacity-50 transition-all duration-200",
  ghost:
    "text-brand-muted hover:bg-brand-surface hover:text-brand-text focus-visible:ring-brand-muted disabled:opacity-50 transition-colors duration-200 rounded-xl",
} as const;

const sizes = {
  sm: "rounded-xl px-4 py-2 text-xs font-medium uppercase tracking-wider",
  md: "rounded-xl px-5 py-2.5 text-sm font-medium",
  lg: "rounded-xl px-8 py-3.5 text-base font-medium",
} as const;

type LinkButtonVariant = keyof typeof variants;
type LinkButtonSize = keyof typeof sizes;

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export interface LinkButtonProps
  extends Omit<LinkProps, "href">,
    AnchorProps {
  href: LinkProps["href"];
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  disabled?: boolean;
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  (
    {
      href,
      variant = "default",
      size = "md",
      disabled = false,
      className,
      onClick,
      tabIndex,
      "aria-disabled": ariaDisabled,
      ...props
    },
    ref
  ) => {
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          "fx-button inline-flex items-center justify-center gap-2 font-medium focus-visible:outline-none",
          variants[variant],
          sizes[size],
          disabled && "pointer-events-none opacity-50",
          className
        )}
        aria-disabled={disabled || ariaDisabled}
        tabIndex={disabled ? -1 : tabIndex}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        {...props}
      />
    );
  }
);

LinkButton.displayName = "LinkButton";
