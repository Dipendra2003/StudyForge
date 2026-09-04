#!/usr/bin/env bash
# =============================================================================
# StudyForge — PostgreSQL Automated Backup Script
# =============================================================================
# Usage:
#   ./scripts/backup-db.sh                     # Automatic detection (Docker or local)
#   BACKUP_DIR=/custom/path ./scripts/backup-db.sh
#   RETENTION_DAYS=30 ./scripts/backup-db.sh
# =============================================================================

set -eo pipefail

# Configuration with defaults
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="${CONTAINER_NAME:-studyforge-db}"
DB_NAME="${POSTGRES_DB:-studyforge}"
DB_USER="${POSTGRES_USER:-postgres}"

# Color output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Create backup directory
mkdir -p "$BACKUP_DIR"

BACKUP_FILENAME="studyforge_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

log_info "Starting StudyForge database backup at $(date)..."

# Determine execution mode: Docker container or direct pg_dump
DOCKER_AVAILABLE=false
if command -v docker >/dev/null 2>&1; then
  if (timeout 3 docker ps --format '{{.Names}}' 2>/dev/null || docker ps --format '{{.Names}}' 2>/dev/null) | grep -q "^${CONTAINER_NAME}$"; then
    DOCKER_AVAILABLE=true
  fi
fi

if [ "$DOCKER_AVAILABLE" = "true" ]; then
  log_info "Detected running container '${CONTAINER_NAME}'. Performing dump via Docker..."
  docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
    --clean --if-exists --no-owner --no-privileges | gzip > "${BACKUP_FILEPATH}"
elif command -v pg_dump >/dev/null 2>&1; then
  log_info "Docker container not running, but local 'pg_dump' found. Performing local dump..."
  if [ -n "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" --clean --if-exists --no-owner --no-privileges | gzip > "${BACKUP_FILEPATH}"
  else
    PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" pg_dump \
      -h "${DB_HOST:-localhost}" \
      -p "${DB_PORT:-5432}" \
      -U "${DB_USER}" \
      -d "${DB_NAME}" \
      --clean --if-exists --no-owner --no-privileges | gzip > "${BACKUP_FILEPATH}"
  fi
else
  log_error "Neither running Docker container '${CONTAINER_NAME}' nor local 'pg_dump' utility found."
  log_error "Please ensure StudyForge database container is running or install postgresql-client."
  exit 1
fi

# Verify backup was created and is non-empty
if [ -f "${BACKUP_FILEPATH}" ] && [ -s "${BACKUP_FILEPATH}" ]; then
  FILESIZE=$(ls -lh "${BACKUP_FILEPATH}" | awk '{print $5}')
  log_success "Database backup created successfully: ${BACKUP_FILEPATH} (${FILESIZE})"
else
  log_error "Backup failed or generated an empty file: ${BACKUP_FILEPATH}"
  rm -f "${BACKUP_FILEPATH}"
  exit 1
fi

# Rotate old backups
log_info "Cleaning up backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
OLD_COUNT=$(find "${BACKUP_DIR}" -name "studyforge_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" 2>/dev/null | wc -l || true)

if [ "${OLD_COUNT}" -gt 0 ]; then
  find "${BACKUP_DIR}" -name "studyforge_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete
  log_info "Removed ${OLD_COUNT} outdated backup archive(s)."
else
  log_info "No outdated backups found."
fi

log_success "Backup process finished cleanly at $(date)."
exit 0
