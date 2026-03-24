# Release v0.3.0

Data: 2026-03-20

## Escopo desta release

Minor release focada em **experiência do tenant com WhatsApp**, **visibilidade operacional no admin** (worker/pipeline e mapa relacional) e **hardening de mensagens de erro** nas integrações de messaging, além de **documentação e exemplos de deploy** alinhados à tag.

## Principais mudanças

### 1) Reconexão WhatsApp (tenant)

- Rota em Configurações para Evolution/UAZAPI: status, QR e fluxo de reconexão.
- APIs em `/api/dashboard/integrations/messaging/*` com autenticação de tenant e proxy seguro aos provedores.
- Entrada na sidebar (Canais) apontando para a mesma área.

### 2) Admin: worker e arquitetura

- Página **Worker & pipeline**: visão de filas e fluxo operacional.
- **Diagrama relacional** de entidades com ligações (mapa arquitetural).

### 3) UX e segurança na superfície

- Erros de API de messaging apresentados de forma amigável, sem vazar detalhes técnicos ao usuário final.

### 4) Documentação

- `CHANGELOG.md`, `REVISAO_GERAL_2026-03.md`, exemplos `stack.env.example` / `.env.example` e guias de deploy com tag **v0.3.0**.

## Referências

- Changelog: raiz do repositório `CHANGELOG.md`.
- Revisão consolidada: [REVISAO_GERAL_2026-03.md](REVISAO_GERAL_2026-03.md).
