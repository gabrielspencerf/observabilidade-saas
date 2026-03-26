#!/usr/bin/env bash
set -euo pipefail

# Restore logico do Postgres a partir de dump .sql.gz gerado pelo db-backup.sh.
# Uso:
#   BACKUP_FILE=/var/backups/observabilidade/observabilidade-app-20260317_230000.sql.gz ./scripts/ops/db-restore.sh
#
# Opcional:
#   FORCE=1 para pular confirmacao interativa.

STACK_NAME="${STACK_NAME:-observabilidade}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-${STACK_NAME}_postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-vysen}"
BACKUP_FILE="${BACKUP_FILE:-}"
FORCE="${FORCE:-0}"

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Erro: informe BACKUP_FILE apontando para o arquivo .sql.gz."
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Erro: arquivo de backup nao encontrado: ${BACKUP_FILE}"
  exit 1
fi

CONTAINER_ID="$(docker ps --filter "name=${POSTGRES_SERVICE}" --format "{{.ID}}" | sed -n '1p')"
if [[ -z "${CONTAINER_ID}" ]]; then
  echo "Erro: container do Postgres nao encontrado para o servico ${POSTGRES_SERVICE}."
  exit 1
fi

if [[ "${FORCE}" != "1" ]]; then
  echo "ATENCAO: este restore ira sobrescrever os dados atuais do banco ${POSTGRES_DB}."
  read -r -p "Digite RESTORE para continuar: " CONFIRM
  if [[ "${CONFIRM}" != "RESTORE" ]]; then
    echo "Restore cancelado."
    exit 0
  fi
fi

echo "Iniciando restore a partir de ${BACKUP_FILE}"
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_ID}" psql \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -v ON_ERROR_STOP=1

echo "Restore concluido com sucesso."
