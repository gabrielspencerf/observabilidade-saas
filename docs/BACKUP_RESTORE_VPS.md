# Backup e Restore (VPS)

Este guia define o fluxo de backup/snapshot para producao no VPS.

## Objetivo

- Garantir backup logico diario do Postgres.
- Permitir restore rapido em incidente.
- Manter snapshot fisico do volume para contingencia.

## Scripts

- `scripts/ops/db-backup.sh`: dump logico (`pg_dump`) em `.sql.gz`.
- `scripts/ops/db-restore.sh`: restore logico via `psql`.
- `scripts/ops/db-snapshot-volume.sh`: snapshot do volume Docker do Postgres (`.tar.gz`).

## Variaveis principais

Defina no host (ou `stack.env` local do servidor):

- `STACK_NAME` (default: `observabilidade`)
- `POSTGRES_SERVICE` (default: `${STACK_NAME}_postgres`)
- `POSTGRES_USER` (default: `postgres`)
- `POSTGRES_DB` (default: `vysen`)
- `POSTGRES_VOLUME_NAME` (default: `app_postgres_data`)
- `BACKUP_DIR` (default: `/var/backups/${STACK_NAME}`)
- `BACKUP_RETENTION_DAYS` (default: `7`)
- `SNAPSHOT_RETENTION_DAYS` (default: `7`)

## Preparacao no VPS

```bash
cd /opt/observabilidade/app
chmod +x scripts/ops/db-backup.sh scripts/ops/db-restore.sh scripts/ops/db-snapshot-volume.sh
mkdir -p /var/backups/observabilidade
```

## Execucao manual

### 1) Backup logico

```bash
STACK_NAME=observabilidade BACKUP_DIR=/var/backups/observabilidade ./scripts/ops/db-backup.sh
```

### 2) Snapshot de volume

```bash
STACK_NAME=observabilidade POSTGRES_VOLUME_NAME=app_postgres_data BACKUP_DIR=/var/backups/observabilidade ./scripts/ops/db-snapshot-volume.sh
```

### 3) Restore logico (destrutivo)

```bash
BACKUP_FILE=/var/backups/observabilidade/observabilidade-app-YYYYMMDD_HHMMSS.sql.gz ./scripts/ops/db-restore.sh
```

Para execucao nao interativa:

```bash
FORCE=1 BACKUP_FILE=/var/backups/observabilidade/observabilidade-app-YYYYMMDD_HHMMSS.sql.gz ./scripts/ops/db-restore.sh
```

## Agendamento (cron)

Exemplo de rotina diaria (03:10 backup, 03:40 snapshot):

```cron
10 3 * * * cd /opt/observabilidade/app && STACK_NAME=observabilidade BACKUP_DIR=/var/backups/observabilidade BACKUP_RETENTION_DAYS=14 ./scripts/ops/db-backup.sh >> /var/log/observabilidade-backup.log 2>&1
40 3 * * * cd /opt/observabilidade/app && STACK_NAME=observabilidade POSTGRES_VOLUME_NAME=app_postgres_data BACKUP_DIR=/var/backups/observabilidade SNAPSHOT_RETENTION_DAYS=7 ./scripts/ops/db-snapshot-volume.sh >> /var/log/observabilidade-backup.log 2>&1
```

## Teste de restore (recomendado semanal)

1. Escolher um backup recente.
2. Restaurar em ambiente de homologacao/staging (nao em producao).
3. Validar:
   - login admin;
   - leitura de leads/conversas;
   - integracoes listadas.
4. Registrar data/resultado do teste em log operacional.

## Observacoes de seguranca

- Nao versionar arquivos de backup.
- Restrinja permissao da pasta de backup (`chmod 700` + dono root/admin).
- Copie backups para armazenamento externo (offsite) para estrategia 3-2-1.
