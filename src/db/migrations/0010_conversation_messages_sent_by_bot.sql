-- Indica se a mensagem foi enviada por IA/BOT (agente) ou por humano.
-- Mensagens "out" vindas do webhook (Evolution/UAZAPI) são consideradas do agente.
ALTER TABLE "conversation_messages"
ADD COLUMN IF NOT EXISTS "sent_by_bot" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN "conversation_messages"."sent_by_bot" IS 'True quando a mensagem foi enviada por agente/IA/BOT (não por humano).';
