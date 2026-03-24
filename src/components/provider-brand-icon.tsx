import Image from "next/image";
import { cn } from "@/lib/utils";

type ProviderBrand = "whatsapp" | "evolution" | "uazapi" | "googleAds" | "typebot";

interface ProviderBrandIconProps {
  provider: ProviderBrand;
  frameClassName?: string;
  className?: string;
}

const PROVIDER_META: Record<ProviderBrand, { src: string; alt: string }> = {
  whatsapp: { src: "/brands/whatsapp.png", alt: "WhatsApp" },
  evolution: { src: "/brands/evolution.png", alt: "Evolution API" },
  uazapi: { src: "/brands/uazapi.png", alt: "UAZAPI" },
  googleAds: { src: "/brands/google-ads.svg", alt: "Google Ads" },
  typebot: { src: "/brands/typebot.png", alt: "Typebot" },
};

export function ProviderBrandIcon({ provider, frameClassName, className }: ProviderBrandIconProps) {
  const meta = PROVIDER_META[provider];
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-border/80 bg-brand-surface/80",
        frameClassName
      )}
    >
      <Image
        src={meta.src}
        alt={meta.alt}
        width={16}
        height={16}
        className={cn("h-4 w-4 rounded-sm object-contain", className)}
      />
    </span>
  );
}
