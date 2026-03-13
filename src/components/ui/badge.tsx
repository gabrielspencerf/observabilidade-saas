import * as React from "react";

const variants = {
  default: "bg-brand-surface text-brand-muted border-brand-border",
  success: "bg-brand-neon/10 text-brand-neon border-brand-neon/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
  info: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
