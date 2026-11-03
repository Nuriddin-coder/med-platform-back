#!/bin/sh
set -e

# ==============================================================================
# MED Medical Platform - PostgreSQL Database Automated Backup Script
# ==============================================================================
#
# Cron Configuration Example:
# Run every day at 03:00 AM Tashkent time:
# 0 3 * * * /path/to/med-platform-back/scripts/backup.sh >> /var/log/med_db_backup.log 2>&1
#
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="med_db_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting MED database backup..."

if [ -n "${DATABASE_URL}" ]; then
  # Dump directly using connection string
  pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_DIR}/${BACKUP_FILENAME}"
elif [ -n "${POSTGRES_CONTAINER}" ]; then
  # Dump via docker container
  docker exec -t "${POSTGRES_CONTAINER}" pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-med_platform}" | gzip > "${BACKUP_DIR}/${BACKUP_FILENAME}"
else
  # Default local/compose container dump
  docker compose exec -T postgres pg_dump -U postgres med_platform | gzip > "${BACKUP_DIR}/${BACKUP_FILENAME}"
fi

BACKUP_SIZE=$(ls -lh "${BACKUP_DIR}/${BACKUP_FILENAME}" | awk '{print $5}')
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup successfully created: ${BACKUP_DIR}/${BACKUP_FILENAME} (${BACKUP_SIZE})"

# Remove backups older than RETENTION_DAYS
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "med_db_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup process completed successfully."

