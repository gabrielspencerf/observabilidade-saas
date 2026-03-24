#!/usr/bin/env bash
set -euo pipefail

# Snapshot do volume Docker do Postgres (camada fisica).
# Uso:
#   STACK_NAME=observabilidade POSTGRES_VOLUME_NAME=app_postgres_data ./scripts/ops/db-snapshot-volume.sh

STACK_NAME="${STACK_NAME:-observabilidade}"
POSTGRES_VOLUME_NAME="${POSTGRES_VOLUME_NAME:-app_postgres_data}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/${STACK_NAME}}"
SNAPSHOT_RETENTION_DAYS="${SNAPSHOT_RETENTION_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
SNAPSHOT_FILE="${BACKUP_DIR}/${POSTGRES_VOLUME_NAME}-${TIMESTAMP}.tar.gz"

echo "Iniciando snapshot do volume ${POSTGRES_VOLUME_NAME}"
docker run --rm \
  -v "${POSTGRES_VOLUME_NAME}:/volume:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine:3.20 \
  sh -c "cd /volume && tar -czf /backup/$(basename "${SNAPSHOT_FILE}") ."

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${SNAPSHOT_FILE}" > "${SNAPSHOT_FILE}.sha256"
fi

echo "Snapshot concluido: ${SNAPSHOT_FILE}"

if [[ "${SNAPSHOT_RETENTION_DAYS}" =~ ^[0-9]+$ ]]; then
  find "${BACKUP_DIR}" -type f -name "${POSTGRES_VOLUME_NAME}-*.tar.gz*" -mtime +"${SNAPSHOT_RETENTION_DAYS}" -delete
  echo "Retencao aplicada para snapshots: ${SNAPSHOT_RETENTION_DAYS} dias."
else
  echo "Aviso: SNAPSHOT_RETENTION_DAYS invalido (${SNAPSHOT_RETENTION_DAYS}). Retencao ignorada."
fi
