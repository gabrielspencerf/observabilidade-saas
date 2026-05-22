# Precheck Execution - Fase B.0.1 (ambiente com dados reais)

## 1. Objetivo
- Executar os prechecks de legado da migration de canais nativos com evidencia auditavel.
- Produzir decisao objetiva: `apto para migration` ou `bloqueado`.

## 2. Onde rodar com seguranca
- Ambiente recomendado: **staging com snapshot/dados reais**.
- Ambiente alternativo: producao (somente leitura), se staging nao estiver disponivel.
- Nao usar base local vazia para liberar migration.

## 3. Precondicoes obrigatorias
- `DATABASE_URL` do ambiente alvo disponivel no shell de execucao.
- Permissao de leitura em:
  - `conversations`
  - `evolution_instances`
  - `uazapi_instances`
  - `pg_constraint`
  - `pg_indexes`
- Confirmacao explicita do ambiente antes de rodar:
  - `staging` ou `producao`.

## 4. Ordem de execucao (por criticidade)

### Bloco Critico A - bloqueio imediato
1. Sanidade de origem operacional atual (`migration-precheck.md` 3.1 query 1).
2. Duplicidade de conversa Evolution (`migration-precheck.md` 3.2 query 1).
3. Duplicidade de conversa UAZAPI (`migration-precheck.md` 3.2 query 2).
4. `external_id` nulo/vazio (`migration-precheck.md` 3.3 query 1).
5. Orphan FK Evolution/UAZAPI (`migration-precheck.md` 3.4 query 1 e 2).

Se qualquer query acima retornar linhas, decisao parcial = **bloqueado**.

### Bloco Informativo B - diagnostico complementar
6. Distribuicao de origem (`migration-precheck.md` 3.1 query 2).
7. Distribuicao de tamanho de `external_id` (`migration-precheck.md` 3.3 query 2).
8. Inventario de constraints e indices aplicados (`migration-precheck.md` 3.5).

## 5. Comando recomendado (manual, sem script novo)

## 5.1 Validar conectividade
```powershell
npm run db:wait
```

## 5.2 Executar queries no cliente SQL do ambiente
- Opcao A: `psql` (recomendado para log simples)
- Opcao B: cliente SQL de operacao ja aprovado pela equipe

Exemplo com `psql`:
```powershell
psql "$env:DATABASE_URL"
```
Em seguida executar, na ordem, os blocos SQL de:
- `docs/specs/canais-chatwoot-whatsapp-cloud/migration-precheck.md`

## 6. Registro de saida (obrigatorio)
- Registrar em `docs/log/REGISTRO.md`:
  - timestamp,
  - ambiente,
  - query/check,
  - total de linhas retornadas,
  - risco identificado,
  - bloqueia migration? (sim/nao).

Template minimo por check:
- **Check:** `3.1.1`
- **Resultado:** `0 linhas` ou `N linhas`
- **Risco:** `nenhum` ou descricao objetiva
- **Decisao:** `nao bloqueia` ou `bloqueia`

## 7. Regra de decisao final
- **Apto para migration** somente se:
  - todos os checks do Bloco Critico A retornarem `0 linhas` (ou sem inconsistencias),
  - ambiente tiver volume representativo de conversas para validar legado (nao aceitar `conversations = 0` como aprovacao automatica),
  - inventario de constraints/indices coerente com o esperado,
  - evidencia registrada no `REGISTRO.md`.
- **Bloqueado** se:
  - qualquer check critico retornar inconsistencia,
  - execucao ocorrer em ambiente sem representatividade de dados reais para este dominio,
  - houver incerteza de ambiente (ex.: base nao confirmada como staging/prod com dados reais),
  - nao houver log auditavel dos resultados.

## 8. Resultado esperado da B.0.1
- Um registro auditavel e reproduzivel da execucao dos prechecks.
- Decisao objetiva de go/no-go da migration, sem suposicao.
