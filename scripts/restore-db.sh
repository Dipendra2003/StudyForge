#!/usr/bin/env bash
# =============================================================================
# StudyForge — PostgreSQL Database Restore Script
# =============================================================================
# Usage:
#   ./scripts/restore-db.sh ./backups/studyforge_backup_20260904_120000.sql.gz
#   ./scripts/restore-db.sh ./backups/studyforge_backup_20260904_120000.sql.gz -y
# =============================================================================

set -eo pipefail

BACKUP_FILE="$1"
CONFIRM_FLAG="$2"
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

if [ -z "$BACKUP_FILE" ]; then
  log_error "Missing backup file path argument."
  echo "Usage: $0 <path-to-backup.sql.gz> [-y]"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  log_error "Backup file not found: $BACKUP_FILE"
  exit 1
fi

log_warn "==================================================================="
log_warn "WARNING: This will overwrite existing data in database '${DB_NAME}'!"
log_warn "Target file: $BACKUP_FILE"
log_warn "==================================================================="

if [ "$CONFIRM_FLAG" != "-y" ] && [ "$CONFIRM_FLAG" != "--force" ]; then
  read -p "Are you sure you want to proceed with database restoration? (y/N): " -r CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    log_info "Database restoration cancelled by user."
    exit 0
  fi
fi

log_info "Starting restoration at $(date)..."

# Determine execution mode: Docker container or direct psql
DOCKER_AVAILABLE=false
if command -v docker >/dev/null 2>&1; then
  if (timeout 3 docker ps --format '{{.Names}}' 2>/dev/null || docker ps --format '{{.Names}}' 2>/dev/null) | grep -q "^${CONTAINER_NAME}$"; then
    DOCKER_AVAILABLE=true
  fi
fi

if [ "$DOCKER_AVAILABLE" = "true" ]; then
  log_info "Restoring to Docker container '${CONTAINER_NAME}'..."
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
  else
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "$BACKUP_FILE"
  fi
elif command -v psql >/dev/null 2>&1; then
  log_info "Restoring using local 'psql'..."
  if [ -n "$DATABASE_URL" ]; then
    if [[ "$BACKUP_FILE" == *.gz ]]; then
      gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
    else
      psql "$DATABASE_URL" < "$BACKUP_FILE"
    fi
  else
    if [[ "$BACKUP_FILE" == *.gz ]]; then
      PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" gunzip -c "$BACKUP_FILE" | psql \
        -h "${DB_HOST:-localhost}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}"
    else
      PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql \
        -h "${DB_HOST:-localhost}" \
        -p "${DB_PORT:-5432}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" < "$BACKUP_FILE"
    fi
  fi
else
  log_error "Neither running Docker container '${CONTAINER_NAME}' nor local 'psql' utility found."
  exit 1
fi

log_success "Database restoration completed successfully at $(date)."
exit 0
