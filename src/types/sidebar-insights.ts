export type SidebarInsightValueType = "ratio" | "percent" | "currency" | "status" | "number";

export interface SidebarInsightCard {
  id: string;
  label: string;
  value: number | null;
  valueType: SidebarInsightValueType;
  hint: string;
  statusLabel?: string;
}

export interface SidebarInsightsPayload {
  periodDays: number;
  cards: SidebarInsightCard[];
}
