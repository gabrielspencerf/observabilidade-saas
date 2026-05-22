export type VysenChatRole = "user" | "assistant";

export type VysenContextArea =
  | "geral"
  | "conversas"
  | "leads"
  | "oportunidades"
  | "ads"
  | "funil"
  | "operacao";

export interface VysenChatMessage {
  role: VysenChatRole;
  text: string;
}

export interface VysenChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  contextArea: VysenContextArea;
  contexts: string[];
  summary: string;
  messages: VysenChatMessage[];
}

export interface VysenChatApiHistoryItem {
  role: VysenChatRole;
  content: string;
}

export interface VysenChatMemoryContext {
  threadSummary?: string;
  threadContexts?: string[];
  previousSummaries?: string[];
}

export interface SendVysenChatParams {
  endpoint: string;
  question: string;
  contextArea?: string;
  history?: VysenChatApiHistoryItem[];
  memoryContext?: VysenChatMemoryContext;
}

export interface SendVysenChatResult {
  answer?: string;
  error?: string;
}
