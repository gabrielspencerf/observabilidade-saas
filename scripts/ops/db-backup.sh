#!/usr/bin/env bash
set -euo pipefail

# Backup logico do Postgres via pg_dump dentro do container da stack.
# Uso:
#   STACK_NAME=observabilidade BACKUP_DIR=/var/backups/observabilidade ./scripts/ops/db-backup.sh

STACK_NAME="${STACK_NAME:-observabilidade}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-${STACK_NAME}_postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-vysen}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/${STACK_NAME}}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"

CONTAINER_ID="$(docker ps --filter "name=${POSTGRES_SERVICE}" --format "{{.ID}}" | sed -n '1p')"
if [[ -z "${CONTAINER_ID}" ]]; then
  echo "Erro: container do Postgres nao encontrado para o servico ${POSTGRES_SERVICE}."
  echo "Dica: valide STACK_NAME/POSTGRES_SERVICE e se a stack esta em execucao."
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${STACK_NAME}-${POSTGRES_DB}-${TIMESTAMP}.sql.gz"
TMP_FILE="${BACKUP_FILE}.tmp"

echo "Iniciando backup logico: ${BACKUP_FILE}"
docker exec "${CONTAINER_ID}" pg_dump \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip -9 > "${TMP_FILE}"

mv "${TMP_FILE}" "${BACKUP_FILE}"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
fi

echo "Backup concluido: ${BACKUP_FILE}"

if [[ "${BACKUP_RETENTION_DAYS}" =~ ^[0-9]+$ ]]; then
  find "${BACKUP_DIR}" -type f -name "${STACK_NAME}-${POSTGRES_DB}-*.sql.gz*" -mtime +"${BACKUP_RETENTION_DAYS}" -delete
  echo "Retencao aplicada: arquivos com mais de ${BACKUP_RETENTION_DAYS} dias removidos."
else
  echo "Aviso: BACKUP_RETENTION_DAYS invalido (${BACKUP_RETENTION_DAYS}). Retencao ignorada."
fi
