import Image from "next/image";
import { Braces, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

type InfraService = "api" | "db" | "redis" | "worker";

interface InfraServiceIconProps {
  service: InfraService;
  frameClassName?: string;
  className?: string;
}

export function InfraServiceIcon({ service, frameClassName, className }: InfraServiceIconProps) {
  if (service === "api") {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-border/80 bg-brand-surface/80",
          frameClassName
        )}
      >
        <Braces className={cn("h-4 w-4 text-brand-neon", className)} />
      </span>
    );
  }

  if (service === "worker") {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-border/80 bg-brand-surface/80",
          frameClassName
        )}
      >
        <Cpu className={cn("h-4 w-4 text-brand-neon", className)} />
      </span>
    );
  }

  const src = service === "db" ? "/brands/postgresql.svg" : "/brands/redis.png";
  const alt = service === "db" ? "PostgreSQL" : "Redis";
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-border/80 bg-brand-surface/80",
        frameClassName
      )}
    >
      <Image src={src} alt={alt} width={16} height={16} className={cn("h-4 w-4 rounded-sm object-contain", className)} />
    </span>
  );
}
