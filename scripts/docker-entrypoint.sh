#!/bin/sh
set -e

echo "🐳 StudyForge Docker Entrypoint"
echo "================================"

# -----------------------------------------------
# Wait for PostgreSQL to be ready
# -----------------------------------------------
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Waiting for PostgreSQL..."

  # Extract host and port from DATABASE_URL
  # Format: postgres://user:pass@host:port/dbname
  # Also handles: postgres://user:pass@host:port/dbname?sslmode=require
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\).*|\1|p')

  # Default to standard values if parsing fails
  DB_HOST=${DB_HOST:-db}
  DB_PORT=${DB_PORT:-5432}

  MAX_RETRIES=30
  RETRY_COUNT=0

  until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "❌ PostgreSQL not available after $MAX_RETRIES attempts. Exiting."
      exit 1
    fi
    echo "  Attempt $RETRY_COUNT/$MAX_RETRIES — waiting for $DB_HOST:$DB_PORT..."
    sleep 2
  done

  echo "✅ PostgreSQL is ready at $DB_HOST:$DB_PORT"
fi

# -----------------------------------------------
# Wait for Redis (optional — don't fail if unavailable)
# -----------------------------------------------
if [ -n "$REDIS_HOST" ]; then
  echo "⏳ Checking Redis at $REDIS_HOST:${REDIS_PORT:-6379}..."
  REDIS_RETRIES=5
  REDIS_COUNT=0

  while [ $REDIS_COUNT -lt $REDIS_RETRIES ]; do
    if nc -z "$REDIS_HOST" "${REDIS_PORT:-6379}" 2>/dev/null; then
      echo "✅ Redis is ready"
      break
    fi
    REDIS_COUNT=$((REDIS_COUNT + 1))
    echo "  Redis attempt $REDIS_COUNT/$REDIS_RETRIES..."
    sleep 2
  done

  if [ $REDIS_COUNT -ge $REDIS_RETRIES ]; then
    echo "⚠️  Redis not available — continuing without caching"
  fi
fi

# -----------------------------------------------
# Run database migrations (if enabled)
# -----------------------------------------------
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "🔄 Running database migrations..."
  npx drizzle-kit migrate 2>&1 || {
    echo "⚠️  Migration failed — the app may still work if schema is up to date"
  }
  echo "✅ Migrations complete"
fi

# -----------------------------------------------
# Start the application
# -----------------------------------------------
echo ""
echo "🚀 Starting StudyForge..."
echo "   NODE_ENV=$NODE_ENV"
echo "   PORT=${API_PORT:-5000}"
echo ""

# Execute the CMD passed to this entrypoint
exec "$@"
