# Migration Precheck - Fase B.0 (legado e seguranca)

## 1. Objetivo
- Executar validacoes de legado antes da migration de canais nativos.
- Identificar bloqueios que podem invalidar nova `CHECK` ou novos indices.
- Guia operacional de execucao: `docs/specs/canais-chatwoot-whatsapp-cloud/precheck-execution.md`.

## 2. Escopo dos checks
- Tabela foco: `conversations`.
- Objetivo:
  - garantir consistencia da origem operacional atual,
  - antecipar falhas de constraint/index na futura migration.

## 3. SQL de precheck (somente leitura)

### 3.1 Sanidade da origem operacional atual
```sql
-- Linhas invalidas para a regra atual (exatamente uma origem entre evolution/uazapi)
select
  id,
  tenant_id,
  evolution_instance_id,
  uazapi_instance_id,
  external_id
from conversations
where
  (evolution_instance_id is not null and uazapi_instance_id is not null)
  or
  (evolution_instance_id is null and uazapi_instance_id is null);
```

```sql
-- Contagem de distribuicao de origem atual
select
  case
    when evolution_instance_id is not null and uazapi_instance_id is null then 'evolution'
    when evolution_instance_id is null and uazapi_instance_id is not null then 'uazapi'
    when evolution_instance_id is not null and uazapi_instance_id is not null then 'invalid_both'
    else 'invalid_none'
  end as origin_bucket,
  count(*) as total
from conversations
group by 1
order by 2 desc;
```

### 3.2 Duplicidade de conversa por origem atual
```sql
-- Duplicata Evolution que quebraria indice unico parcial
select
  tenant_id,
  evolution_instance_id,
  external_id,
  count(*) as total
from conversations
where evolution_instance_id is not null
group by tenant_id, evolution_instance_id, external_id
having count(*) > 1
order by total desc;
```

```sql
-- Duplicata UAZAPI que quebraria indice unico parcial
select
  tenant_id,
  uazapi_instance_id,
  external_id,
  count(*) as total
from conversations
where uazapi_instance_id is not null
group by tenant_id, uazapi_instance_id, external_id
having count(*) > 1
order by total desc;
```

### 3.3 Qualidade de `external_id`
```sql
-- External id nulo ou vazio (risco para dedup de conversa)
select
  id,
  tenant_id,
  evolution_instance_id,
  uazapi_instance_id,
  external_id
from conversations
where external_id is null or btrim(external_id) = '';
```

```sql
-- Distribuicao de comprimento de external_id (sinal de dado truncado/inconsistente)
select
  min(length(external_id)) as min_len,
  max(length(external_id)) as max_len,
  avg(length(external_id)) as avg_len
from conversations;
```

### 3.4 Integridade de FK atual
```sql
-- Conversas apontando para evolution inexistente (deveria ser zero)
select c.id, c.tenant_id, c.evolution_instance_id
from conversations c
left join evolution_instances e on e.id = c.evolution_instance_id
where c.evolution_instance_id is not null and e.id is null;
```

```sql
-- Conversas apontando para uazapi inexistente (deveria ser zero)
select c.id, c.tenant_id, c.uazapi_instance_id
from conversations c
left join uazapi_instances u on u.id = c.uazapi_instance_id
where c.uazapi_instance_id is not null and u.id is null;
```

### 3.5 Inventario de constraints/indices aplicados no banco
```sql
-- Constraints da tabela conversations
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'conversations'::regclass
order by conname;
```

```sql
-- Indices da tabela conversations
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'conversations'
order by indexname;
```

## 4. Criterio de bloqueio (go/no-go para aplicar migration)
- **Bloqueia migration** se qualquer item abaixo ocorrer:
  - retorno nao vazio no check 3.1;
  - duplicatas nos checks 3.2;
  - `external_id` nulo/vazio no check 3.3;
  - orphan FK no check 3.4.
  - ambiente sem representatividade de dados reais de conversa (ex.: `conversations = 0`), classificando resultado como **inconclusivo** para liberar migration.

## 5. Evidencia minima para aprovar precheck
- Salvar resultado de cada query com timestamp e ambiente.
- Anexar resumo em `docs/log/REGISTRO.md` quando executado em staging/prod.
- Marcar explicitamente: `apto para migration` ou `bloqueado`.

## 6. Se ambiente local nao permitir execucao real
- Executar estes checks no primeiro ambiente com dados reais (staging).
- Nao avancar para migration em prod sem evidencia de precheck aprovada em staging.
