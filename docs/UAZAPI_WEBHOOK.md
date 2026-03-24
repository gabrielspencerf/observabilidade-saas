# Webhook UAZAPI — eventos e formato

A UAZAPI tem **documentação própria**, diferente da Evolution API. Use a documentação oficial para configurar o webhook e ativar os eventos corretos.

## Onde consultar

- **Documentação:** [docs.uazapi.com](https://docs.uazapi.com) ou no painel da sua instância (ex.: `seudominio.uazapi.com`).
- Procure por **webhook**, **callback** ou **eventos** para:
  - Configurar a URL do webhook (use a URL que aparece em **Admin → Integrações** no hub, coluna “URL do webhook” da instância UAZAPI).
  - Saber **quais eventos ativar** (ex.: recebimento de mensagem, envio de mensagem). Os nomes exatos dependem da documentação da UAZAPI.

## O que o hub aceita

- **Campo de tipo:** no JSON do webhook, o hub lê `event` ou `type` (tipo do evento).
- **Nomes de evento:** após normalizar para minúsculas e trocar `_` por `.`, o hub trata como “mensagem” os eventos que equivalem a:
  - `messages.upsert` / `messages_upsert`
  - `send.message` / `send_message`
  - E também: `message`, `message.received`, `message.receive`, `message_received`, `on.message`, `on_message`, `received.message`, `received_message`
- **Formato do payload:** para criar conversas e mensagens no dashboard, o hub espera estrutura **compatível com Evolution**:
  - `data.key` com `remoteJid`, `id` (ou `messageId`), `fromMe`
  - `data.message` com texto (`conversation`, `extendedTextMessage.text`) ou mídia (`audioMessage`, `imageMessage` com `caption` opcional)

Se a UAZAPI enviar outro formato (ex.: campos no nível raiz ou nomes diferentes), pode ser necessário ajustar o parser em `src/server/integrations/uazapi/parse.ts` e o processador em `src/workers/processors/uazapi.ts`. Em **Admin → Observabilidade** você pode ver se os eventos estão chegando e se há erros de processamento.

## Resumo

1. Consulte a **documentação da UAZAPI** para ver os eventos disponíveis e ativar os de mensagem.
2. Configure a **URL do webhook** (a do hub, com o UUID da instância).
3. Se as conversas não aparecerem, confira **Admin → Observabilidade** (eventos UAZAPI e erros) e, se preciso, adapte o parser/worker ao formato real enviado pela UAZAPI.
