# SMTP + Reset + Google Login (Invite-only)

Este documento descreve o setup da fase de autenticacao:

- SMTP transacional (Poste.io)
- reset de senha por link
- acesso inicial por link ao criar usuario
- login com Google (invite-only)
- sessao curta com opcao "lembrar de mim"

## 1) Variaveis de ambiente

Defina no `stack.env` (VPS):

- `AUTH_PASSWORD_RESET_ENABLED`
- `AUTH_GOOGLE_LOGIN_ENABLED`
- `AUTH_REMEMBER_ME_ENABLED`
- `NEXT_PUBLIC_AUTH_PASSWORD_RESET_ENABLED`
- `NEXT_PUBLIC_AUTH_GOOGLE_LOGIN_ENABLED`
- `NEXT_PUBLIC_AUTH_REMEMBER_ME_ENABLED`
- `AUTH_DEFAULT_SESSION_TTL_SECONDS`
- `AUTH_REMEMBER_ME_TTL_SECONDS`
- `AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES`

SMTP:

- `SMTP_ENABLED`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM=hub@creativelane.io` (credenciais SMTP podem permanecer neste dominio mesmo com app em outro host)
- `SMTP_REPLY_TO=hub@creativelane.io` (opcional)

Google OAuth:

- `GOOGLE_AUTH_CLIENT_ID`
- `GOOGLE_AUTH_CLIENT_SECRET`
- `GOOGLE_AUTH_REDIRECT_URI`
- `GOOGLE_AUTH_STATE_SECRET`

## 2) DNS de e-mail (voce aplica)

Para entregabilidade minima:

- SPF (TXT) autorizando seu host SMTP
- DKIM (TXT) com chave publica gerada no Poste.io
- DMARC (TXT), exemplo inicial:
  - `v=DMARC1; p=none; rua=mailto:postmaster@exemplo.com; fo=1`

Depois de validar entregas, evoluir para `p=quarantine` e `p=reject`.

## 3) Fluxos implementados

- `POST /api/auth/password-reset/request`
  - resposta neutra
  - rate limit por IP
- `POST /api/auth/password-reset/confirm`
  - token single-use
  - expiracao por tempo
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
  - invite-only: apenas usuarios ja cadastrados e ativos

UI:

- `/forgot-password`
- `/reset-password`
- `/login` e `/admin-login` com:
  - lembrar de mim
  - botao Google (quando flag habilitada)

## 4) Rollout por feature flag

Sugestao de ativacao:

1. Habilitar apenas reset:
   - `AUTH_PASSWORD_RESET_ENABLED=true`
   - `NEXT_PUBLIC_AUTH_PASSWORD_RESET_ENABLED=true`
2. Testar envio e redefinicao.
3. Habilitar Google:
   - `AUTH_GOOGLE_LOGIN_ENABLED=true`
   - `NEXT_PUBLIC_AUTH_GOOGLE_LOGIN_ENABLED=true`
4. Validar invite-only com 1 usuario de teste.

## 5) Hardening aplicado

- Rate limit no login (`/api/auth/login`).
- Rate limit no reset request (`/api/auth/password-reset/request`).
- Resposta neutra no request de reset (nao revela se email existe).
- Token de reset single-use com expiracao.
- Ao redefinir senha, todas as sessoes ativas do usuario sao invalidadas.

## 6) Checklist go-live (VPS)

1. Rodar migracao para criar `password_reset_tokens`.
2. Validar SMTP (`SMTP_ENABLED=true`) com envio real.
3. Ativar reset por flag e testar:
   - solicitacao de link
   - expiracao
   - invalidacao de sessoes apos reset
4. Ativar Google por flag e testar invite-only:
   - usuario existente entra
   - usuario nao cadastrado bloqueia
5. Monitorar logs nas primeiras 24h (login, callback Google e SMTP).
