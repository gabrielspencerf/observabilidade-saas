# UAZAPI em paridade com Evolution

A integração UAZAPI foi alinhada ao mesmo fluxo da Evolution: webhook → eventos brutos → fila → worker → conversas e mensagens no dashboard.

## UAZAPI vs Evolution — documentação diferente

A **documentação oficial da UAZAPI** fica em **docs.uazapi.com** (ou no painel da sua instância, ex.: `seudominio.uazapi.com`). O formato do webhook e os **nomes dos eventos** podem ser diferentes da Evolution API.

- **Evolution:** eventos como `MESSAGES_UPSERT`, `SEND_MESSAGE`; payload com `event`, `data.key` (remoteJid, id, fromMe), `data.message`.
- **UAZAPI:** consulte a documentação da UAZAPI para os **eventos exatos** que precisam estar ativos no webhook (ex.: recebimento de mensagem, envio de mensagem). O hub aceita tanto o campo `event` quanto `type` no JSON e normaliza o nome para minúsculas com ponto (ex.: `messages.upsert`, `send.message`).

## O que foi implementado

### 1. Banco de dados (migração `0004_uazapi_webhook_and_conversations.sql`)
- **Tabela `uazapi_webhook_events`**: eventos brutos do webhook UAZAPI (espelho de `evolution_webhook_events`).
- **Tabela `conversations`**: passa a aceitar **Evolution ou UAZAPI**:
  - `evolution_instance_id` e `uazapi_instance_id` (um dos dois obrigatório, outro nulo).
  - Constraint de checagem e índices únicos parciais por provedor.

**Aplicar a migração:** executar o SQL em `src/db/migrations/0004_uazapi_webhook_and_conversations.sql` no banco (ou via ferramenta de migrations do projeto).

### 2. Webhook
- **POST `/api/webhooks/uazapi/[instanceId]`**  
  - `instanceId` = UUID da instância em `uazapi_instances.id`.
  - Validação por UUID; corpo JSON; rate limit; gravação em `uazapi_webhook_events` e enfileiramento.

### 3. Formato do payload (compatível com Evolution)
O parser aceita o mesmo formato usado na Evolution:
- `event` (ou `type`) = tipo do evento.
- `data.key` com `remoteJid`, `id` (ou `messageId`), `fromMe`.
- `data.message` com texto (`conversation`, `extendedTextMessage.text`) ou mídia (`audioMessage`, `imageMessage` com `caption` opcional).

Eventos de mensagem tratados (após normalização: minúsculas, `_` → `.`): `messages.upsert`, `messages_upsert`, `send.message`, `send_message`. Também aceitos outros nomes comuns: `message`, `message.received`, `message.receive`, `message_received`, `on_message`, `received_message` — para compatibilidade com documentação UAZAPI que use nomenclatura diferente da Evolution.

### 4. Worker
- Fila **queue:raw:uazapi** e DLQ **queue:dlq:uazapi**.
- Processador `processUazapiRaw`: lê evento, cria/atualiza conversa por `(tenant_id, uazapi_instance_id, external_id)` e insere mensagem (texto, áudio, imagem com legenda).  
- **Áudio/imagem:** por enquanto só persiste legenda; transcrição/descrição (Whisper/Vision) pode ser adicionada quando houver endpoint de mídia UAZAPI documentado.

### 5. Dashboard
- **Conversas:** listagem e detalhe consideram conversas de **Evolution e UAZAPI** (left join em ambas as tabelas de instância; nome da instância preenchido conforme o provedor).
- **Detalhe do lead:** “Conversas vinculadas” mostra conversas de ambos os provedores.

### 6. Admin
- **Integrações:** tabela de instâncias UAZAPI com coluna **URL do webhook** (igual à Evolution), no formato `[APP_URL]/api/webhooks/uazapi/{id}`.
- **Observabilidade:** filas **UAZAPI** e **DLQ UAZAPI** exibidas nas métricas de fila.

## Configuração na UAZAPI

1. **Documentação:** Confira em **docs.uazapi.com** (ou no painel da instância) quais eventos o webhook da UAZAPI envia e como ativá-los (ex.: “recebimento de mensagem”, “envio de mensagem”).
2. Em **Admin → Integrações**, copie a **URL do webhook** da instância UAZAPI (com o UUID).
3. Na UAZAPI, configure o **webhook/callback** com essa URL e ative os eventos de **mensagem** conforme a documentação deles.
4. O payload deve ser JSON com **`event` ou `type`** (tipo do evento) e, para gerar conversas no hub, estrutura compatível: **`data.key`** com `remoteJid`, `id` (ou `messageId`), `fromMe`, e **`data.message`** com texto ou mídia. Se a UAZAPI usar outro formato, pode ser necessário ajustar o parser em `src/server/integrations/uazapi/parse.ts` e/ou o processador em `src/workers/processors/uazapi.ts`.
5. Garanta que o **worker** está rodando (mesmo processo que processa Evolution/Typebot) para que os jobs da fila UAZAPI sejam processados.

## Resumo de paridade

| Recurso                    | Evolution | UAZAPI |
|---------------------------|-----------|--------|
| Webhook por instance ID   | Sim       | Sim    |
| Eventos brutos em tabela   | Sim       | Sim    |
| Fila + worker              | Sim       | Sim    |
| Conversas + mensagens      | Sim       | Sim    |
| Listagem no dashboard      | Sim       | Sim    |
| Transcrição áudio (Whisper)| Sim       | Não*   |
| Descrição imagem (Vision)  | Sim       | Não*   |

\* Pode ser adicionado quando houver API UAZAPI para obter mídia (equivalente ao getBase64FromMediaMessage da Evolution).
