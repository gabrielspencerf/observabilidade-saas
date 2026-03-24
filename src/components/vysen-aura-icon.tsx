import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface VysenAuraIconProps {
  className?: string;
}

export function VysenAuraIcon({ className }: VysenAuraIconProps) {
  return <Sparkles className={cn("text-brand-neon", className)} aria-hidden />;
}
