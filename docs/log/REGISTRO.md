# Registro de erros, falhas e soluções

Itens mais recentes no topo. Formato: **Contexto** → **Erro** → **Causa** → **Solução**.

---

## Revisão de documentação e higiene para Git — 2026-03-20

- **Contexto:** Consolidar changelog, variáveis, segurança e evitar vazamento de infra no repositório.
- **Ação:** Criado [docs/REVISAO_GERAL_2026-03.md](../REVISAO_GERAL_2026-03.md); atualizados `SECURITY_ENDPOINTS_MAP`, `RESUMO_PROJETO`, `GETTING_STARTED`; exemplos em `.env.example` e `stack.env.example` anonimizados (sem domínio/e-mail de cliente); fallback de `SMTP_FROM` no código alterado para endereço genérico; `.gitignore` ampliado para dumps/backups comuns.
- **Referência:** checklist pré-push e lista do que não versionar no doc de revisão geral.

---

## 1. Inicialização da aplicação (Next.js dev) — 2025-03-09

### 1.1 PowerShell: token `&&` inválido

- **Contexto:** Executar `cd c:\...\APP && npm run dev` no terminal (PowerShell).
- **Erro:** `O token '&&' não é um separador de instruções válido nesta versão.`
- **Causa:** No PowerShell (versões antigas ou padrão), `&&` não é operador de encadeamento de comandos.
- **Solução:** Usar `;` no lugar de `&&`, ou rodar os comandos separados. Ex.: `Set-Location c:\Users\gabri\Desktop\APP; npm run dev`.

---

### 1.2 Comando `next` não reconhecido

- **Contexto:** `npm run dev` (que chama `next dev`).
- **Erro:** `'next' não é reconhecido como um comando interno ou externo, um programa operável ou um arquivo em lotes.`
- **Causa:** O binário `next` em `node_modules/.bin` não está no PATH no contexto em que o script roda (comum em alguns ambientes Windows/IDE).
- **Solução:** Usar `npx next dev` para garantir que o Node resolva o binário do pacote instalado. Opcional: adicionar script no `package.json`, ex.: `"dev": "npx next dev"`.

---

### 1.3 Turbopack: workspace root inferido incorretamente

- **Contexto:** Next.js 16.1.6 com Turbopack (padrão em `next dev`).
- **Erro:** `Turbopack build failed ... Next.js inferred your workspace root, but it may not be correct. We couldn't find the Next.js package (next/package.json) from the project directory: C:\...\APP\src\app`
- **Causa:** O Turbopack está inferindo o diretório de trabalho como `src/app` em vez da raiz do projeto, e a partir daí não resolve `node_modules/next`.
- **Solução (alternativa usada):** Rodar o dev com **Webpack** em vez de Turbopack: `npx next dev --webpack`. Script adicionado no `package.json`: `"dev:webpack": "next dev --webpack"`.  
  **Solução (futura, quando suportada):** Configurar `turbopack.root` no `next.config` com o caminho absoluto da raiz do projeto (em Next 16 a chave é de nível superior; em versões anteriores poderia estar em `experimental`).

---

### 1.4 Next.js instalando dependências ao rodar dev

- **Contexto:** Primeira execução de `npx next dev --webpack`.
- **Mensagem:** `It looks like you're trying to use TypeScript but do not have the required package(s) installed. Installing dependencies (@types/react, @types/node, etc.)`
- **Causa:** Next.js detecta `tsconfig.json` e arquivos TypeScript; se faltar algum tipo em devDependencies, tenta instalar.
- **Solução:** Deixar a instalação concluir ou garantir que `npm install` já foi rodado na raiz do projeto antes de `npm run dev`/`dev:webpack`.

---

### 1.5 Flag `--webpack` não existe no Next 15

- **Contexto:** Rodar `npm run dev:webpack` (script com `next dev --webpack`).
- **Erro:** `error: unknown option '--webpack'`
- **Causa:** No Next 15 o bundler padrão do `next dev` já é Webpack; a flag `--webpack` existe no Next 16 (onde Turbopack passou a ser padrão). No projeto está instalado Next 15 (`^15.0.0`).
- **Solução:** Usar apenas `npm run dev` (ou `npx next dev` com o next local). O script `dev:webpack` pode ser mantido para quando o projeto for atualizado para Next 16 e o Turbopack voltar a dar problema de root.

---

### 1.6 Porta 3000 em uso

- **Contexto:** Segunda execução de `npm run dev` com outro processo já usando a porta 3000.
- **Comportamento:** Next.js avisa e usa a próxima disponível: `Port 3000 is in use by process XXXXX, using available port 3001 instead.`
- **Solução:** Nenhuma ação obrigatória; acessar a app na porta indicada (ex.: http://localhost:3001). Para liberar a 3000, encerrar o processo que a está usando (Task Manager ou `Get-Process -Id 26152 | Stop-Process` no PowerShell).

---

### 1.9 Andamento: initdb falhou; script setup-local.ps1

- **Contexto:** Dar andamento ao setup com PostgreSQL.
- **Situação:** Binários em `C:\Program Files\PostgreSQL\16\bin` existem; o diretório `data` não existe (instalação via winget não concluiu o assistente). Tentativa de `initdb` em pasta local (`pgdata`) falhou com erro `$libdir/dict_snowball` não encontrado (instalação incompleta).
- **Ação:** Criado script **`scripts/setup-local.ps1`** que roda em sequência `db:create`, `db:migrate`, `db:seed` (usar quando o Postgres estiver rodando). Atualizado **docs/POSTGRESQL_WINDOWS.md** com seção “Se os binários existem mas o serviço não aparece” (reinstalar/concluir assistente) e uso do `setup-local.ps1`. Adicionado `/pgdata` ao `.gitignore`.

---

### 1.8 Instalação do PostgreSQL via winget

- **Contexto:** Usuário pediu para instalar o necessário para rodar PostgreSQL local.
- **Ação:** Executado `winget install PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements --silent`. O download (346 MB) e o início da instalação foram concluídos; o instalador do EDB pode abrir um assistente para definir a senha do usuário `postgres` e a porta.
- **Pós-instalação:** É preciso (1) concluir o assistente (senha do `postgres`; usar `postgres` para bater com o `.env` ou ajustar o `.env`), (2) iniciar o serviço PostgreSQL em `services.msc` (ou `Start-Service postgresql-x64-16`), (3) rodar `npm run db:create`, `db:migrate`, `db:seed`. Guia em [docs/POSTGRESQL_WINDOWS.md](../POSTGRESQL_WINDOWS.md).

---

### 1.7 PostgreSQL não está rodando (ECONNREFUSED :5432)

- **Contexto:** Rodar `scripts/create-db.ts` ou `npm run db:migrate` após criar o `.env` com `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vysen`.
- **Erro:** `connect ECONNREFUSED 127.0.0.1:5432` (e `::1:5432`).
- **Causa:** O serviço PostgreSQL não está instalado ou não está em execução no Windows.
- **Solução:** Instalar o PostgreSQL (ex.: [postgresql.org/download/windows](https://www.postgresql.org/download/windows)) ou subir um container Docker (`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`). Depois iniciar o serviço (Services → postgresql-x64) ou garantir que o container está rodando. Em seguida rodar `npx tsx scripts/create-db.ts` e `npm run db:migrate` e `npm run db:seed`.

---

### 1.13 Porta diferente a cada vez que sobe o dev

- **Contexto:** Ao rodar `npm run dev`, a aplicação às vezes abria em 3001, 3002, 3003, etc.
- **Causa:** O Next.js, quando a porta padrão **3000** já está em uso (por exemplo um `npm run dev` anterior ainda rodando em outro terminal), escolhe automaticamente a próxima porta livre e só avisa no terminal.
- **Solução:** O script `dev` foi alterado para **fixar a porta 3000**: `next dev -p 3000`. Assim a app sempre sobe em **http://localhost:3000**. Se a 3000 estiver ocupada, o comando vai **falhar** (erro “port already in use”) em vez de mudar de porta — aí é só encerrar o processo que está usando a 3000 (ou fechar o outro terminal onde o dev estava rodando) e rodar `npm run dev` de novo.

---

### 1.14 404 "This page could not be found" na raiz (/)

- **Contexto:** Ao acessar a aplicação (ex.: http://localhost:3000), a página exibia 404 mesmo com `app/page.tsx` e `app/login/page.tsx` existindo.
- **Causa:** Conflito de rotas: no App Router, o grupo `(dashboard)` **não** altera a URL. Assim, `app/(dashboard)/page.tsx` também mapeava para **`/`**, gerando duas páginas para a mesma rota e comportamento indefinido (404).
- **Solução:** Toda a área do dashboard foi movida para dentro do segmento `dashboard`: de `app/(dashboard)/page.tsx` e `app/(dashboard)/home`, `context`, etc. para `app/(dashboard)/dashboard/page.tsx` e `app/(dashboard)/dashboard/home`, `context`, etc. Com isso, a rota `/` fica apenas com `app/page.tsx` (landing) e `/dashboard`, `/dashboard/home`, etc. passam a funcionar. Também foi incluído `"/"` explicitamente no `matcher` do middleware e removido o layout vazio do grupo `(auth)`. Limpar `.next` e reiniciar o dev após a alteração.

---

### 1.12 404 ao acessar a aplicação (login)

- **Contexto:** Após corrigir o ENOENT (limpar .next), ao acessar a URL da app no navegador retornava 404.
- **Causa provável:** No Windows, o Next.js pode falhar ao resolver rotas em pastas com parênteses no nome (route groups como `(auth)`), gerando arquivos em `.next\server\app\(auth)\...` que não são encontrados corretamente.
- **Solução:** A página de login foi movida do grupo `(auth)` para a rota direta: de `app/(auth)/login/page.tsx` para `app/login/page.tsx`. A URL continua sendo `/login`. O grupo `(auth)` pode permanecer vazio ou ser removido; não afeta a rota `/login`.

---

### 1.11 ENOENT no navegador: .next/server/app/(auth)/login/page.js

- **Contexto:** Ao acessar a aplicação no navegador (ex.: página de login), erro: `ENOENT: no such file or directory, open '...\.next\server\app\(auth)\login\page.js'`.
- **Causa:** Cache de build do Next.js (pasta `.next`) desatualizado ou corrompido; o arquivo compilado esperado não existe.
- **Solução:** Apagar a pasta `.next` e reiniciar o servidor para forçar recompilação: `Remove-Item -Recurse -Force .next` (ou `rm -rf .next`), depois `npm run dev`. Na primeira requisição à rota, o Next gera os arquivos em `.next` de novo.

---

### 1.10 NOTICE de truncamento de identificador nas migrations

- **Contexto:** Ao rodar `npm run db:migrate`, o PostgreSQL emite mensagens do tipo: `o identificador "evolution_webhook_events_evolution_instance_id_evolution_instances_id_fk" será truncado para "evolution_webhook_events_evolution_instance_id_evolution_instan"`.
- **Causa:** O PostgreSQL limita identificadores (nomes de constraints, tabelas, etc.) a **63 caracteres**. O Drizzle gera nomes longos para FKs (tabela_coluna_tabela_ref_id_fk), e alguns passam de 63 caracteres; o Postgres trunca e avisa (NOTICE).
- **É erro?** Não. As migrations foram aplicadas com sucesso; a constraint existe com o nome truncado e funciona normalmente.
- **Quer evitar em novos schemas:** Use `foreignKey()` no terceiro argumento do `pgTable` com `name: "nome_curto_fk"` (máx. 63 caracteres) em vez de `.references()` na coluna, para tabelas novas. Para o schema já migrado, não é obrigatório alterar.

---

## Como adicionar novas entradas

1. Abra [REGISTRO.md](./REGISTRO.md).
2. Insira uma nova seção **acima** da mais recente (número seguinte ao atual).
3. Use o formato: **Contexto** → **Erro** → **Causa** → **Solução**.
4. Se houver relação com outra entrada, referencie (ex.: “Ver também 1.3”).
