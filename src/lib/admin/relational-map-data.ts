/**
 * Mapa conceitual das principais tabelas e chaves (tenant_id, FKs) para o diagrama do admin.
 * Não precisa listar 100% do schema — foco em fluxo relacional que o super admin reconhece.
 */

export type PillarAccent = "blue" | "violet" | "amber" | "emerald";

export interface RelationalPillar {
  id: string;
  title: string;
  subtitle: string;
  accent: PillarAccent;
  /** Tabelas principais deste domínio */
  tables: string[];
  /** Bloco secundário (estilo “sub-card” da referência) */
  highlight: { label: string; hint: string };
  /** Ligações conceituais para o núcleo (rótulo curto) */
  linksToHub: string[];
}

export const RELATIONAL_PILLARS: RelationalPillar[] = [
  {
    id: "channels",
    title: "Canais & métricas",
    subtitle: "Google Ads · Meta · Clarity",
    accent: "blue",
    tables: [
      "google_ads_accounts",
      "meta_ads_accounts",
      "clarity_connections",
      "campaign_snapshots",
      "meta_ads_insight_snapshots",
      "clarity_insight_snapshots",
      "google_ads_sync_logs",
      "meta_ads_sync_logs",
    ],
    highlight: { label: "SYNC & SNAPSHOTS", hint: "Jobs em fila → logs + séries" },
    linksToHub: ["tenant_id", "accountId / connectionId → worker"],
  },
  {
    id: "messaging",
    title: "Mensagens & bots",
    subtitle: "Evolution · UAZAPI · Typebot",
    accent: "violet",
    tables: [
      "evolution_instances",
      "uazapi_instances",
      "typebot_bots",
      "integrations",
      "evolution_webhook_events",
      "uazapi_webhook_events",
      "typebot_webhook_events",
    ],
    highlight: { label: "WEBHOOK → RAW", hint: "POST API → staging → Redis" },
    linksToHub: ["tenant_id", "instance_id / bot_id", "processed_at"],
  },
  {
    id: "commercial",
    title: "Comercial & CRM",
    subtitle: "Leads · funil · conversas",
    accent: "amber",
    tables: [
      "leads",
      "lead_events",
      "funnels",
      "funnel_steps",
      "conversations",
      "conversation_messages",
      "opportunities",
      "followup_tasks",
      "utm_attributions",
    ],
    highlight: { label: "LEAD & INBOX", hint: "Worker grava após parse dos eventos" },
    linksToHub: ["tenant_id", "lead_id · conversation_id"],
  },
  {
    id: "identity",
    title: "Identidade & acesso",
    subtitle: "Tenants · usuários · RBAC",
    accent: "emerald",
    tables: [
      "tenants",
      "users",
      "memberships",
      "roles",
      "permissions",
      "role_permissions",
      "sessions",
      "user_profiles",
    ],
    highlight: { label: "RBAC", hint: "memberships liga user ↔ tenant ↔ role" },
    linksToHub: ["tenant_id (escopo)", "user_id"],
  },
];

export const HUB_COPY = {
  title: "Núcleo operacional",
  subtitle: "LIVE DATA CENTER",
  lines: [
    "Worker (Node) consome filas Redis",
    "Commits idempotentes no Postgres",
    "Chave comum: tenant_id + FKs por domínio",
  ],
} as const;
