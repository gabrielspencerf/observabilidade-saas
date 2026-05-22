# Vysen / Observabilidade SaaS
## Plano de Implantação F1-F5
### Governança, Confiabilidade e Adoção Spec-Anchored
**Versão:** 1.1  
**Data:** 16/04/2026

---

## 1. Resumo executivo

Esta versão 1.1 transforma o plano anterior em uma base mais executável. A estratégia permanece a mesma: preservar a arquitetura boa, reduzir risco estrutural e só depois ampliar velocidade. O ajuste principal é operacional: cada fase agora tem **owner sugerido**, **apoio**, **cadência**, **métricas objetivas**, **risco principal** e **mitigação mínima**.

O projeto não está pedindo uma reescrita metodológica. Está pedindo disciplina aplicada nos pontos que realmente podem causar dano: **tenant / auth / RBAC**, **worker / filas / webhooks**, **Vysen / IA / telemetria** e **drift entre documentação e implementação**.

A ordem continua não negociável:

1. **F1 - Canonização documental**
2. **F2 - Harness mínimo de confiança**
3. **F3 - Fronteiras críticas e rollout seguro**
4. **F4 - Processo leve spec-anchored**
5. **F5 - Refactor cirúrgico em hotspots**

Trocar essa ordem é o jeito mais rápido de aumentar complexidade antes de aumentar confiança.

---

## 2. Premissas operacionais

- O repositório atual continua sendo a fonte primária de verdade.
- O plano é incremental e compatível com uma base criada e acelerada com Cursor.
- Não haverá retrofit artificial de SDD no passado.
- Mudança grande sem harness e sem fronteira validada é proibida.
- Toda definição abaixo deve ser lida como **padrão operacional interno**, não como sugestão decorativa.

---

## 3. Governança do plano

- **Owner do plano:** Tech Lead / responsável técnico do projeto.
- **Co-owner recomendado:** Product/Operations Lead.
- **Apoio fixo:** responsável por app, responsável por worker/infra, responsável por segurança/QA.
- **Cadência de checkpoint:** 2 checkpoints por semana enquanto F1-F3 estiverem abertos.
- **Ritual mínimo:** revisão curta de status + bloqueios + evidências de aceite.
- **Regra de avanço:** nenhuma fase avança sem critérios mínimos de pronto e evidências registradas.
- **Registro canônico:** `docs/plano_f1_f5_governanca_vysen_v1_1.md` + changelog/revisão vinculada.

### Papéis sugeridos por trilha
- **Tech Lead:** decisão técnica, priorização de risco, aprovação de avanço de fase.
- **App Lead:** dashboard/admin, auth de superfície, smoke web.
- **Backend/Infra Lead:** worker, fila, env, CI, webhooks, rollout.
- **Security/Platform:** RLS, CSRF, PII, auditoria, checklists de fronteira.
- **QA/Reviewer:** validação de critérios de aceite e rastreio de evidências.

> Observação: se o time for pequeno, uma pessoa pode acumular papéis. O importante é não deixar owner implícito.

---

## 4. Métricas-mãe do plano

Estas métricas atravessam todas as fases:

- **Contradições doc-código em documentos canônicos:** meta 0 abertas ao final de F1.
- **Gates mínimos obrigatórios no CI:** meta 100% ativos ao final de F2.
- **Smoke dos fluxos críticos:** meta 100% dos fluxos definidos rodando no CI ao final de F2.
- **Invariantes críticas formalizadas:** meta 100% das fronteiras definidas cobertas ao final de F3.
- **Mudanças médias/grandes com spec/plan/validation:** meta 100% após ativação de F4.
- **Refactor sem evidência de ganho:** meta 0 permitido em F5.

### 4.1 Baseline operacional inicial (obrigatório antes de medir evolução)

Antes de iniciar execução de fase, registrar baseline em `docs/log/REGISTRO.md` (ou documento operacional equivalente), com no mínimo:

- quantidade de contradições doc-código abertas (canônicas);
- estado atual dos gates de CI (ativos/inativos);
- cobertura atual de smoke dos 5 fluxos críticos;
- tempo atual do pipeline mínimo;
- número de inconsistências conhecidas entre painéis/métricas operacionais;
- incidentes recentes ligados aos hotspots de F5.

---

## 5. Visão geral das fases

- **F1 — Canonização documental**
  - Objetivo principal: eliminar drift semântico e definir autoridade documental.
  - Owner sugerido: Tech Lead.
  - Cadência: 2 checkpoints/semana.
  - Nível: obrigatório.
- **F2 — Harness mínimo**
  - Objetivo principal: lint, typecheck, build e smoke do core no fluxo oficial.
  - Owner sugerido: Backend/Infra + App Lead.
  - Cadência: 2 checkpoints/semana.
  - Nível: obrigatório.
- **F3 — Fronteiras críticas**
  - Objetivo principal: endurecer tenant/auth/RLS/worker/Vysen com rollout seguro.
  - Owner sugerido: Tech Lead + Security/Platform.
  - Cadência: 2 checkpoints/semana.
  - Nível: obrigatório.
- **F4 — Spec-anchored incremental**
  - Objetivo principal: padronizar mudanças novas sem burocratizar ajuste pequeno.
  - Owner sugerido: Tech Lead.
  - Cadência: 1 checkpoint/semana.
  - Nível: recomendado.
- **F5 — Refactor cirúrgico**
  - Objetivo principal: corrigir hotspots reais com gatilho técnico explícito.
  - Owner sugerido: Tech Lead + owner do hotspot.
  - Cadência: 1 checkpoint/semana.
  - Nível: recomendado.

---

## 6. F1 - Canonização documental

### Objetivo
Definir autoridade clara dos documentos e remover contradições objetivas entre docs, regras do Cursor e runtime real.

### Owner sugerido
- **Owner:** Tech Lead
- **Apoio:** App Lead, Backend/Infra, quem mantém `.cursor/rules`

### Escopo
- Separar docs em: **foundation**, **constitution**, **operations**, **history**
- Corrigir drift em fila, migrações e regra admin/dashboard
- Amarrar `README.md`, `docs/` e `.cursor/rules`

### Ações obrigatórias
1. Confirmar:
   - `README.md` = visão curta do produto + onboarding
   - `docs/PADRAO_DESENVOLVIMENTO.md` = constitution v0
   - `docs/RESUMO_PROJETO.md` = foundation
   - `CHANGELOG.md` + revisões + rollout docs = history/operations
2. Criar `docs/MATRIZ_AUTORIDADE_DOCUMENTAL.md`
3. Corrigir imediatamente:
   - qualquer menção a **BullMQ** se a fila real ainda for Redis manual
   - revisão de migrações desatualizada
   - divergência sobre link Admin no dashboard
4. Alinhar `.cursor/rules` ao documento normativo final

### Critérios de aceite
- 0 contradições abertas nos documentos canônicos priorizados
- existe matriz de autoridade documental aprovada
- qualquer pessoa do time consegue responder onde está a regra oficial de:
  - produto/base
  - padrão de desenvolvimento
  - operação/histórico
  - segurança crítica

### Métricas de fase
- número de contradições doc-código resolvidas: **meta 100% das conhecidas**
- docs normativas com owner explícito: **meta 100%**
- regras do Cursor divergentes do documento normativo: **meta 0**

### Risco principal
Corrigir texto sem corrigir autoridade e continuar com duas verdades paralelas.

### Mitigação
Matriz de autoridade documental aprovada antes de revisar os arquivos periféricos.

### Evidências mínimas de aceite
- `docs/MATRIZ_AUTORIDADE_DOCUMENTAL.md` criado e aprovado.
- registro das contradições resolvidas com referência de arquivo em `docs/log/REGISTRO.md`.
- lista final de documentos normativos/históricos com owner explícito.

### Condição de pausa/rollback da fase
- pausar avanço se surgir nova contradição em documento canônico sem owner definido.
- não iniciar F2 enquanto houver conflito aberto entre doc normativo e `.cursor/rules`.

### Não fazer agora
- não mover o histórico inteiro de pasta
- não renomear tudo por estética
- não converter documentação legada em spec retroativa

---

## 7. F2 - Harness mínimo de confiança

### Objetivo
Criar o menor conjunto de validações automáticas capaz de barrar regressão estrutural óbvia.

### Owner sugerido
- **Owner:** Backend/Infra Lead
- **Apoio:** App Lead, QA/Reviewer

### Stack mínima prescrita
A fase precisa sair com uma stack mínima e oficial. Recomendação objetiva:

- **Lint:** ESLint já alinhado ao projeto
- **Typecheck:** TypeScript (`tsc --noEmit` ou script equivalente)
- **Build:** build oficial do app
- **Smoke web/API:** Playwright para fluxos críticos de borda
- **Smoke complementar de server/worker:** script Node/TS ou runner simples chamando endpoints e verificações de health/readiness

> O importante não é a marca da ferramenta; é sair com um conjunto único, reproduzível e oficial.

### Comandos oficiais a institucionalizar
Estes nomes devem existir e virar padrão do projeto (ajuste fino de nomenclatura permitido uma única vez):

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:web`
- `npm run smoke:api`
- `npm run smoke:worker`
- `npm run ci:verify` -> agregador para o pipeline mínimo

### Escopo obrigatório
- CI com `lint`, `typecheck`, `build`
- smoke de:
  - autenticação
  - tenant resolution / tenant switch
  - boundary dashboard/admin
  - webhook ingest
  - worker heartbeat/readiness
- sanity check de env crítico
- sanity check de migrations

### Critérios de aceite
- pipeline oficial falha quando qualquer gate mínimo falha
- comandos oficiais funcionam localmente e no CI
- pelo menos os 5 fluxos críticos definidos acima estão cobertos por smoke
- tempo total do pipeline mínimo é aceitável para uso frequente

### Métricas de fase
- fluxos críticos com smoke: **meta 5/5**
- gates mínimos ativos no CI: **meta 100%**
- tempo do pipeline `ci:verify`: **meta inicial <= 10 min**
- execução local reproduzível com comandos oficiais: **meta 100%**

### Risco principal
Criar um CI bonito mas pouco usado, lento demais ou dependente de ritual manual.

### Mitigação
Começar pequeno, congelar os comandos oficiais e impedir crescimento caótico da suíte antes da fase estabilizar.

### Evidências mínimas de aceite
- workflow de CI com execução explícita de `lint`, `typecheck`, `build` e `ci:verify`.
- evidência de execução local dos comandos oficiais (log curto em `docs/log/REGISTRO.md`).
- evidência de execução dos 5 smokes críticos no CI.

### Condição de pausa/rollback da fase
- pausar expansão da suíte se o pipeline mínimo ultrapassar a meta de tempo por 3 execuções consecutivas.
- rollback para baseline anterior de pipeline caso mudanças de F2 reduzam confiabilidade de deploy.

### Não fazer agora
- não tentar cobrir o sistema inteiro
- não introduzir framework gigante de teste sem necessidade
- não esperar a suíte perfeita para ligar os gates

---

## 8. F3 - Fronteiras críticas e rollout seguro

### Objetivo
Endurecer os eixos de maior blast radius com invariantes explícitas e rollout controlado.

### Owner sugerido
- **Owner:** Tech Lead
- **Apoio:** Security/Platform, Backend/Infra, App Lead

### Fronteiras obrigatórias
1. tenant context
2. auth / sessão / RBAC
3. integrações / webhooks / worker
4. Vysen / IA / telemetria / fallback
5. segurança / PII / auditoria

### Ações obrigatórias
1. Criar checklist executável de invariantes por fronteira
2. Garantir que tenant continue vindo do backend/contexto de sessão
3. Revisar boundary dashboard/admin com regra oficial de exposição
4. Desenhar rollout de RLS por ambiente
5. Revisar idempotência, retry, reprocessamento e visibilidade de falha de webhook/worker
6. Consolidar telemetria mínima do Vysen
7. Unificar leitura operacional onde houver métricas contraditórias

### Rollout explícito de RLS
#### Dev
- mapear queries críticas
- identificar pontos onde o worker roda sem `setDbAccessContext`
- levantar incompatibilidades óbvias de contexto

#### Staging
- ativar validações com dados semelhantes aos de produção
- executar smoke de auth, tenant, worker e webhooks com enforcement ativo
- verificar comportamento de jobs que tocam banco sem contexto explícito

#### Produção
- ativação gradual e reversível por flag
- janela controlada
- observação intensiva de falhas, stuck jobs, acesso negado inesperado e throughput

### Critérios de aceite
- todas as fronteiras críticas têm invariantes registradas
- existe plano aprovado de dev -> staging -> produção para RLS
- workers que precisam de contexto de acesso estão mapeados
- auth, tenant e integrações têm validação mínima explícita
- telemetria mínima do Vysen está documentada e implementável

### Métricas de fase
- fronteiras com checklist/invariantes: **meta 5/5**
- fluxos críticos revalidados com staging: **meta 100% dos fluxos definidos**
- workers mapeados quanto a contexto de acesso: **meta 100%**
- métricas operacionais contraditórias entre painéis: **meta 0**

### Risco principal
Ligar enforcement forte sem staging e quebrar worker ou fluxo crítico silenciosamente.

### Mitigação
Nenhum rollout de RLS em produção sem staging validado, plano reversível e mapeamento dos pontos sem contexto.

### Evidências mínimas de aceite
- checklist de invariantes por fronteira publicado e versionado.
- registro de validação em staging com resultado dos smokes críticos.
- plano explícito de ativação e reversão de RLS por ambiente.
- mapeamento dos workers e jobs que exigem contexto de acesso.

### Condição de pausa/rollback da fase
- abortar avanço para produção se staging apresentar falha crítica em auth/tenant/worker/webhook.
- rollback imediato de enforcement em produção ao detectar aumento relevante de acesso negado inesperado ou stuck jobs.

### Não fazer agora
- não tentar resolver toda segurança do sistema em um sprint
- não reescrever worker inteiro antes de validar fronteiras
- não migrar fila por impulso junto com RLS

---

## 9. F4 - Processo leve spec-anchored

### Objetivo
Impedir novo drift nas mudanças futuras sem transformar o projeto em ritual burocrático.

### Owner sugerido
- **Owner:** Tech Lead
- **Apoio:** Product/Operations Lead, QA/Reviewer

### Regra de uso
- **Mudança pequena:** checklist simples / issue
- **Mudança média:** `spec.md` + `plan.md` + `validation.md`
- **Mudança grande ou arriscada:** `spec.md` + `plan.md` + `tasks.md` + `validation.md` + `ADR` quando necessário

### Ações obrigatórias
- publicar templates curtos em `docs/`
- definir gatilho de uso por porte/risco
- revisar PR com checklist de fronteira
- padronizar uso do Cursor com:
  - contexto explícito
  - escopo autorizado de arquivos
  - arquivos proibidos
  - validação pós-diff

### Critérios de aceite
- mudanças médias/grandes novas não entram sem artefatos mínimos
- o time sabe quando usar cada template
- pelo menos uma mudança real passou no fluxo completo

### Métricas de fase
- mudanças médias/grandes novas cobertas pelo fluxo: **meta 100%**
- PRs com checklist de fronteira quando aplicável: **meta 100%**
- tempo extra médio do processo por mudança média: **meta aceitável e revisado após piloto**

### Risco principal
Criar um processo bonito que o time ignora porque ficou pesado.

### Mitigação
Templates curtos, gatilho simples e piloto controlado antes de expandir.

### Evidências mínimas de aceite
- templates `spec.md`, `plan.md`, `validation.md` (e `adr.md` quando aplicável) publicados.
- regra de gatilho por porte/risco registrada no repositório.
- evidência de pelo menos um piloto completo com validação documentada.

### Condição de pausa/rollback da fase
- pausar obrigatoriedade ampla se o piloto mostrar overhead incompatível com a cadência do time.
- manter fluxo apenas para mudanças grandes/arriscadas até recalibrar templates/gatilhos.

### Não fazer agora
- não exigir spec para tudo
- não ritualizar ajuste pequeno
- não tentar converter a história inteira para o novo fluxo

---

## 10. F5 - Refactor cirúrgico em hotspots

### Objetivo
Atacar apenas os pontos com evidência real de fragilidade operacional.

### Owner sugerido
- **Owner:** Tech Lead + owner do hotspot
- **Apoio:** Backend/Infra, App Lead, QA/Reviewer

### Hotspots prioritários
1. **Fila e retry**
2. **Observabilidade operacional**
3. **Vysen**
4. **processing_failures** e rastreabilidade real de falha, se continuar existindo como fonte operacional

### Gatilho de decisão técnica
A fase não deve virar refactor por ansiedade. Abrir mudança maior só quando houver pelo menos um destes gatilhos:

- perda confirmada de job em crash ou reinício
- mais de **3 ocorrências mensais** de requeue manual/stuck job com impacto operacional
- impossibilidade de rastrear status real de um job ponta a ponta
- discrepância recorrente entre painéis/métricas operacionais
- timeout/fallback/telemetria do Vysen insuficientes para operação confiável
- custo operacional claramente maior que o custo do ajuste

### Quando não mexer na fila agora
- se não houver perda confirmada
- se reprocessamento manual for raro e aceitável
- se a rastreabilidade mínima já estiver funcionando
- se o risco maior no momento ainda for rollout de fronteira, não semântica de fila

### Critérios de aceite
- todo refactor vem com problema explícito, evidência e ganho esperado
- nenhum refactor exige reescrever metade do sistema
- fila, observabilidade e Vysen ficam mais previsíveis do que antes

### Métricas de fase
- refactors abertos sem evidência: **meta 0**
- incidentes ligados ao hotspot tratado: **queda observável após implantação**
- tempo de diagnóstico operacional do hotspot: **redução medida após ajuste**
- decisões grandes formalizadas por ADR quando aplicável: **meta 100%**

### Risco principal
Usar F5 como desculpa para reestruturar arquitetura inteira sob o nome de melhoria localizada.

### Mitigação
Exigir gatilho explícito, ADR para mudança maior e evidência de ganho antes da aprovação.

### Evidências mínimas de aceite
- para cada refactor: problema explícito + evidência + métrica de ganho esperado.
- registro pós-implantação com comparação baseline vs resultado.
- ADR anexado para mudanças arquiteturais de maior impacto.

### Condição de pausa/rollback da fase
- pausar refactor quando não houver melhoria mensurável após lote inicial.
- rollback de mudança específica se houver regressão operacional acima do baseline acordado.

### Não fazer agora
- não migrar para DDD por decreto
- não reorganizar toda a árvore `src/`
- não trocar stack por estética arquitetural

---

## 11. Ordem prática sugerida

### Agora
- fechar F1
- subir F2 mínimo
- escolher e implementar smoke dos 5 fluxos críticos

### Em seguida
- executar F3 com foco em tenant/auth/RLS/workers/Vysen
- validar staging antes de qualquer enforcement sensível em produção

### Depois
- ativar F4 para mudanças novas
- rodar 1 piloto de mudança média e 1 piloto de mudança grande/arriscada

### Contínuo
- usar F5 somente com gatilho técnico explícito e evidência de retorno

---

## 12. Definição de pronto por fase

### F1 pronto quando
- matriz de autoridade documental existe
- contradições centrais foram zeradas
- docs normativas e `.cursor/rules` estão alinhadas

### F2 pronto quando
- `ci:verify` existe e roda
- 5 fluxos críticos têm smoke
- gates mínimos estão ativos no CI
- tempo do pipeline mínimo está dentro da meta inicial

### F3 pronto quando
- as 5 fronteiras têm invariantes registradas
- rollout de RLS por ambiente está aprovado
- workers dependentes de contexto de acesso estão mapeados
- métricas críticas não se contradizem

### F4 pronto quando
- templates existem no repositório
- gatilho de uso está documentado
- ao menos uma mudança real passou pelo fluxo com evidência

### F5 pronto quando
- hotspot tratado com problema explícito + ganho observado
- sem reescrita ampla
- com melhoria concreta de previsibilidade operacional

---

## 13. O que não mexer agora

- não reescrever a arquitetura atual
- não desmontar a separação dashboard/admin
- não forçar `src/domain` a virar centro do projeto antes da hora
- não trocar stack de fila só por pureza metodológica
- não abrir refactor transversal de UI + server + worker ao mesmo tempo
- não usar IA como justificativa para pular validação

---

## 14. Encerramento

Esta versão 1.1 mantém a estratégia correta do plano original, mas reduz subjetividade de execução. O objetivo não é produzir mais documento; é produzir **menos ambiguidade, menos risco invisível e menos retrabalho**.

A lógica continua simples:

- primeiro, uma verdade documental só;
- depois, o mínimo de proteção automatizada;
- em seguida, fronteiras duras nos pontos que realmente explodem;
- só então processo formal para mudança nova;
- e refactor apenas onde a realidade já provou que dói.

Isso é menos empolgante do que anunciar uma grande reinvenção. E exatamente por isso tem mais chance de funcionar.