# PostgreSQL no Windows — instalação e uso

O PostgreSQL 16 foi instalado via **winget** (`PostgreSQL.PostgreSQL.16`). Seguem os passos para deixá-lo pronto para o projeto.

---

## 1. Completar a instalação (se abriu o assistente)

O instalador pode ter aberto um **assistente gráfico**. Conclua as telas:

- **Senha do usuário `postgres`:** Use `postgres` se quiser manter o `.env` como está (`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app`). Se escolher outra senha, altere no `.env` a parte `postgres:SUA_SENHA` na `DATABASE_URL`.
- **Porta:** Deixe **5432** (padrão).
- Finalize o assistente.

---

## 2. Iniciar o serviço

O PostgreSQL no Windows roda como serviço.

1. **Services (Serviços):** `Win + R` → `services.msc` → Enter.
2. Procure por **"PostgreSQL 16"** (ou "postgresql-x64-16").
3. Clique com o botão direito → **Iniciar** (ou **Reiniciar** se já estiver rodando).

Ou no **PowerShell (como administrador):**

```powershell
Start-Service postgresql-x64-16
```

(O nome exato pode variar; em alguns instaladores é `PostgreSQL 16`.)

---

## 3. Se os binários existem mas o serviço não aparece

Se você tem `C:\Program Files\PostgreSQL\16\bin` mas o diretório `C:\Program Files\PostgreSQL\16\data` **não existe** (instalação incompleta), o assistente do instalador não foi finalizado. Faça uma das opções:

- **Opção A:** Baixe de novo o instalador em [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) (EDB), execute e **conclua todas as telas** (senha do `postgres`, porta 5432). Isso cria o `data` e registra o serviço.
- **Opção B:** Desinstale pelo “Adicionar ou remover programas” (PostgreSQL 16), depois instale de novo com `winget install PostgreSQL.PostgreSQL.16 --accept-package-agreements` **sem** `--silent`, e conclua o assistente.

Depois vá para a seção 2 (iniciar o serviço) e 3 (criar banco e rodar o projeto).

---

## 4. Criar o banco e rodar o projeto

Com o serviço rodando e a senha do `postgres` igual à do `.env`:

**Forma rápida (um script):**

```powershell
cd c:\Users\gabri\Desktop\APP
.\scripts\setup-local.ps1
npm run dev
```

**Ou passo a passo:**

```bash
cd c:\Users\gabri\Desktop\APP
npm run db:create
npm run db:migrate
npm run db:seed
npm run dev
```

- **db:create** — Cria o banco `app` se não existir.
- **db:migrate** — Aplica as migrations (tabelas).
- **db:seed** — Cria o usuário admin definido em `SEED_ADMIN_EMAIL` e o tenant de teste.
- **dev** — Sobe a aplicação; faça login com o e-mail e a senha do seed.

---

## 5. Se a conexão ainda falhar

- Confirme que o serviço PostgreSQL está **Em execução** em `services.msc`.
- Confirme que a **senha** em `DATABASE_URL` no `.env` é a mesma definida no instalador para o usuário `postgres`.
- Se tiver mudado a porta no instalador, ajuste em `.env`: `postgresql://postgres:postgres@localhost:SUA_PORTA/app`.

---

## 6. Desinstalar (se precisar)

```powershell
winget uninstall PostgreSQL.PostgreSQL.16
```
