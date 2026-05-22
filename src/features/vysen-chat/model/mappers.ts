import type {
  VysenChatApiHistoryItem,
  VysenChatMessage,
  VysenChatThread,
  VysenContextArea,
  VysenChatRole,
} from "@/features/vysen-chat/model/types";

export const MAX_THREAD_CONTEXTS = 30;
export const MAX_THREADS = 30;

export function nowIso(): string {
  return new Date().toISOString();
}

export function createThreadId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildThreadTitle(initialText: string, fallbackIndex: number): string {
  const trimmed = initialText.trim();
  if (!trimmed) return `Conversa ${fallbackIndex}`;
  const title = trimmed.replace(/\s+/g, " ").slice(0, 48);
  return title.length < trimmed.length ? `${title}...` : title;
}

export function summarizeThread(messages: VysenChatMessage[]): string {
  const user = messages.filter((message) => message.role === "user").at(-1)?.text ?? "";
  const assistant = messages.filter((message) => message.role === "assistant").at(-1)?.text ?? "";
  if (!user && !assistant) return "Sem resumo ainda.";
  const userLine = user ? `Pergunta: ${user.replace(/\s+/g, " ").slice(0, 120)}` : "";
  const assistantLine = assistant
    ? `Resposta: ${assistant.replace(/\s+/g, " ").slice(0, 150)}`
    : "";
  return [userLine, assistantLine].filter(Boolean).join(" | ");
}

export function normalizeChatMessage(input: unknown): VysenChatMessage | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as { role?: unknown; text?: unknown };
  const role = candidate.role;
  const text = candidate.text;
  if ((role !== "user" && role !== "assistant") || typeof text !== "string") {
    return null;
  }
  return { role, text: text.slice(0, 4000) };
}

export function normalizeChatMessages(input: unknown): VysenChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => normalizeChatMessage(item))
    .filter((item): item is VysenChatMessage => Boolean(item));
}

export function createChatMessage(role: VysenChatRole, text: string): VysenChatMessage {
  return { role, text };
}

export function createEmptyThread(fallbackIndex: number): VysenChatThread {
  const now = nowIso();
  return {
    id: createThreadId(),
    title: buildThreadTitle("", fallbackIndex),
    createdAt: now,
    updatedAt: now,
    contextArea: "geral",
    contexts: [],
    summary: "Sem resumo ainda.",
    messages: [],
  };
}

function normalizeContextArea(value: unknown): VysenContextArea {
  const allowed: VysenContextArea[] = [
    "geral",
    "conversas",
    "leads",
    "oportunidades",
    "ads",
    "funil",
    "operacao",
  ];
  return allowed.includes(value as VysenContextArea) ? (value as VysenContextArea) : "geral";
}

export function normalizeChatThread(input: unknown, fallbackIndex: number): VysenChatThread | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  const messages = normalizeChatMessages(candidate.messages);
  const id = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : createThreadId();
  const title =
    typeof candidate.title === "string" && candidate.title.trim()
      ? candidate.title.trim().slice(0, 120)
      : buildThreadTitle(messages[0]?.text ?? "", fallbackIndex);
  const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : nowIso();
  const updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : createdAt;
  const contexts = Array.isArray(candidate.contexts)
    ? candidate.contexts
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim().slice(0, 380))
        .slice(0, MAX_THREAD_CONTEXTS)
    : [];
  const contextArea = normalizeContextArea(candidate.contextArea);
  const summary =
    typeof candidate.summary === "string" && candidate.summary.trim()
      ? candidate.summary.trim().slice(0, 280)
      : summarizeThread(messages);
  return {
    id,
    title,
    createdAt,
    updatedAt,
    contextArea,
    contexts,
    summary,
    messages,
  };
}

export function normalizeChatThreads(input: unknown): VysenChatThread[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => normalizeChatThread(item, index + 1))
    .filter((thread): thread is VysenChatThread => Boolean(thread))
    .slice(0, MAX_THREADS);
}

export function toChatApiHistory(messages: VysenChatMessage[], limit = 12): VysenChatApiHistoryItem[] {
  return messages.slice(-limit).map((message) => ({
    role: message.role,
    content: message.text,
  }));
}
