# Revisao UX Estrutural (2026-04)

Base consolidada da revisao de UX, arquitetura de navegacao e hierarquia de produto usando:

- `ux-all-prints/`
- leitura dos shells, sidebars, layouts e paginas principais do app

## 1. Resumo executivo

- O principal problema de UX atual nao e apenas visual; e estrutural.
- O produto hoje opera com duas superficies reais (`admin` e `dashboard`), mas o negocio exige tres camadas distintas:
  - `superadmin`: infraestrutura, plataforma, observabilidade e governanca tecnica
  - `admin`: operacao da empresa, carteira de clientes, analistas e acompanhamento resumido
  - `dashboard`: operacao detalhada do cliente/tenant
- A camada de carteira foi colocada dentro do espaco tecnico, o que mistura papeis e aumenta carga cognitiva.
- A Vysen esta pesada demais no contexto tecnico e ainda pouco contextual nos demais fluxos.
- O dashboard do cliente esta funcional, mas sofre com baixa hierarquia visual, excesso de areas vazias e estados sem orientacao suficiente.
- A home publica e a experiencia de boas-vindas ainda precisam de mais impacto visual e menos dependencia de texto.

## 2. Achados estruturais

### 2.1 Camadas de produto misturadas

- O espaco atual de `admin` concentra:
  - carteira
  - tenants
  - usuarios
  - integracoes
  - worker e dados
  - observabilidade
- Isso junta operacao de negocio com operacao tecnica.
- Resultado: o menu nao representa o modelo mental real de uso.

Arquivos-base:

- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/components/admin-shell.tsx`
- `src/components/admin-sidebar.tsx`
- `src/components/sidebar-navigation.tsx`

### 2.2 Hierarquia de navegacao insuficiente

- O menu lateral tecnico nao separa claramente:
  - governanca da plataforma
  - manutencao tecnica
  - gestao operacional da empresa
- O dashboard do cliente tambem pode melhorar a agrupacao por intencao:
  - captura/comercial
  - canais/conversas
  - receita/produtos
  - administracao/configuracoes

### 2.3 Vysen com protagonismo indevido

- No superadmin, a Vysen ocupa espaco demais e concorre com a tela principal.
- A experiencia atual parece mais um painel extenso de configuracao do que um copiloto.
- Em parte do dashboard, a Vysen e util, mas ainda precisa de entrada mais leve e progressiva.

Arquivos-base:

- `src/components/vysen-bubble-chat.tsx`
- `src/components/dashboard-vysen-chat-dock.tsx`
- `src/components/dashboard-first-access-guide.tsx`
- `src/app/(admin)/admin/agent/page.tsx`

## 3. Achados por superficie

### 3.1 Superadmin

Problemas:

- mistura negocio e infraestrutura
- menu com agrupamento conceitualmente errado
- Vysen pesada e lateral demais
- paginas tecnicas com densidade visual pouco priorizada

Objetivo de UX:

- diagnostico
- seguranca operacional
- manutencao da plataforma
- governanca tecnica

### 3.2 Admin da empresa

Problemas:

- esta ausente como camada formal
- a carteira existe, mas no lugar errado
- nao ha shell, menu, contexto e permissao dedicados a empresa

Objetivo de UX:

- ver carteira resumida
- acompanhar saude dos clientes
- distribuir atuacao de analistas
- comparar desempenho entre contas

### 3.3 Dashboard do cliente

Problemas:

- cards com pesos parecidos entre si
- muito espaco vazio sem funcao narrativa
- estados vazios pouco guiados
- onboarding ainda verbal demais em alguns pontos

Objetivo de UX:

- contexto rapido
- proxima acao clara
- leitura detalhada por tenant
- operacao diaria com baixo atrito

## 4. Falhas de UX recorrentes

### 4.1 Peso de conteudo

- Vysen no superadmin abre pesada
- onboarding usa modal com densidade textual alta
- paginas de configuracao ainda sao formulario-first

### 4.2 Hierarquia visual

- metricas e acoes importantes convivem com elementos secundarios sem contraste suficiente
- cards e blocos de pagina tem pesos visuais proximos
- faltam niveis mais claros de prioridade: urgente, setup, leitura, historico

### 4.3 Menu e orientacao

- menu tecnico mistura dominios de trabalho
- menu do dashboard ainda pode agrupar melhor por intencao
- falta uma camada de navegacao propria para `admin` da empresa

### 4.4 Estados vazios

- constatam ausencia de dados, mas ensinam pouco o que fazer
- faltam CTA principal, beneficio esperado e preview do resultado

### 4.5 Home e boas-vindas

- boa base visual, mas ainda com pouco encantamento
- mockup simples demais para vender o produto
- faltam ilustracoes, vetores e simulacoes mais reais da plataforma

## 5. Direcao recomendada

### 5.1 Arquitetura de produto

- `superadmin`: camada tecnica
- `admin`: camada da empresa
- `dashboard`: camada do cliente

### 5.2 Principios de UX por camada

- `superadmin`: denso, tecnico, objetivo, diagnostico-first
- `admin`: resumido, comparativo, leve, executivo-operacional
- `dashboard`: contextual, acionavel, detalhado, orientado a rotina

### 5.3 Vysen por contexto

- `superadmin`: copiloto tecnico
- `admin`: copiloto analitico da carteira
- `dashboard`: copiloto contextual do tenant

## 6. Prioridade recomendada

1. Separar `superadmin` e `admin` na arquitetura de navegacao.
2. Revisar sidebars, shells e naming das areas.
3. Refazer a Vysen por contexto.
4. Corrigir hierarquia e estados vazios do dashboard cliente.
5. Redesenhar home publica e boas-vindas.

## 7. Referencias auditadas

### Codigo

- `src/app/(admin)/layout.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/components/admin-shell.tsx`
- `src/components/admin-sidebar.tsx`
- `src/components/dashboard-shell.tsx`
- `src/components/dashboard-sidebar.tsx`
- `src/components/vysen-bubble-chat.tsx`
- `src/components/dashboard-vysen-chat-dock.tsx`
- `src/components/dashboard-first-access-guide.tsx`
- `src/app/page.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/app/(admin)/admin/agency/page.tsx`

### Evidencia visual

- `ux-all-prints/routes__01-home.png`
- `ux-all-prints/routes__04-dashboard-home.png`
- `ux-all-prints/routes__05-conversations.png`
- `ux-all-prints/frames-a__frame-t020s.png`
- `ux-all-prints/frames-a__frame-t060s.png`
- `ux-all-prints/frames-b__frame-t130s.png`
- `ux-all-prints/frames-b__frame-t180s.png`
- `ux-all-prints/frames-b__frame-t220s.png`
- `ux-all-prints/frames-b__frame-t250s.png`
- `ux-all-prints/frames-b__frame-t320s.png`
- `ux-all-prints/frames-b__frame-t360s.png`
