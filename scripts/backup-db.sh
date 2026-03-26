#!/bin/sh
set -eu

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_DIR="/backups"

mkdir -p "$BACKUP_DIR"

echo "[backup-job] starting MySQL backup loop (interval=${BACKUP_INTERVAL_SECONDS}s retention=${BACKUP_RETENTION_DAYS}d)"

while true; do
  ts="$(date +%Y%m%d-%H%M%S)"
  file="${BACKUP_DIR}/${MYSQL_DATABASE}-${ts}.sql.gz"

  echo "[backup-job] creating backup: ${file}"
  mysqldump \
    --single-transaction \
    --quick \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    "${MYSQL_DATABASE}" | gzip -c > "${file}"

  echo "[backup-job] pruning backups older than ${BACKUP_RETENTION_DAYS} days"
  find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +"${BACKUP_RETENTION_DAYS}" -delete

  sleep "${BACKUP_INTERVAL_SECONDS}"
done
