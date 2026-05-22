export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export type ContextArea =
  | "geral"
  | "conversas"
  | "leads"
  | "oportunidades"
  | "ads"
  | "funil"
  | "operacao";

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  contextArea: ContextArea;
  contexts: string[];
  summary: string;
  messages: ChatMessage[];
}

export interface PendingChatActionDetail {
  type: "explain" | "use-context-current" | "new-with-context";
  text: string;
}
