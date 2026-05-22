import type { ContextArea } from "@/components/vysen-dock/types";

export const CONTEXT_AREAS: Array<{ id: ContextArea; label: string }> = [
  { id: "geral", label: "Geral" },
  { id: "conversas", label: "Conversas" },
  { id: "leads", label: "Leads" },
  { id: "oportunidades", label: "Oportunidades" },
  { id: "ads", label: "Ads" },
  { id: "funil", label: "Funil" },
  { id: "operacao", label: "Operação" },
];

export const QUICK_PROMPTS = [
  "Quais são os principais gargalos da semana no funil?",
  "Explique o comportamento do gráfico atual e possíveis causas.",
  "Quais ações priorizar hoje para melhorar conversão?",
] as const;

export const THINKING_STATUSES = [
  "Lendo tabelas do banco...",
  "Analisando sinais da operação...",
  "Batendo dados entre contextos...",
  "Priorizando ações de maior impacto...",
] as const;
