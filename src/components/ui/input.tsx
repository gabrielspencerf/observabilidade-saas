import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`block w-full rounded-full border bg-brand-surface/50 px-5 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-neon/40 focus:border-brand-neon disabled:opacity-50 transition-colors backdrop-blur-sm ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-brand-border"
        } ${className}`}
        aria-invalid={error ?? undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
