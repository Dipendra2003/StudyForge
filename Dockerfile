# syntax=docker/dockerfile:1
# =============================================================================
# StudyForge — Production Dockerfile (Multi-Stage)
# =============================================================================
# Stage 1: deps     — Install all dependencies (including native addons)
# Stage 2: build    — Build frontend (Vite) + backend (esbuild)
# Stage 3: runtime  — Minimal production image with only dist + prod deps
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install Dependencies
# ---------------------------------------------------------------------------
FROM node:24.1-alpine3.20 AS deps

# bcrypt requires native build tools (python3, make, g++)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy only package files first for better layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (dev + prod) — needed for the build stage.
# --ignore-scripts skips postinstall (tsc check) to speed up install.
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --legacy-peer-deps

# ---------------------------------------------------------------------------
# Stage 2: Build Application
# ---------------------------------------------------------------------------
FROM node:24.1-alpine3.20 AS build

WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build frontend (Vite → dist/public) and backend (esbuild → dist/index.js)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production Runtime
# ---------------------------------------------------------------------------
FROM node:24.1-alpine3.20 AS runtime

# Install runtime utilities:
#   curl           — for health check script
#   netcat-openbsd — for entrypoint DB wait (nc -z)
RUN apk add --no-cache curl netcat-openbsd

WORKDIR /app

# Copy package files first
COPY package.json package-lock.json ./

# Install production dependencies only.
# bcrypt native addon needs build tools, so we install, build, then remove them
# in a single layer to keep the image small.
RUN --mount=type=cache,target=/root/.npm apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev --ignore-scripts --legacy-peer-deps \
    && npm rebuild bcrypt \
    && apk del .build-deps

# Install drizzle-kit locally so drizzle.config.ts can require() it during migrations.
RUN npm install drizzle-kit --legacy-peer-deps

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy migration files (needed if RUN_MIGRATIONS=true)
COPY --from=build /app/migrations ./migrations
COPY drizzle.config.ts ./

# Copy shared schema (needed at runtime by drizzle for migrations)
COPY --from=build /app/shared ./shared

# Copy entrypoint and health check scripts
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY scripts/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /usr/local/bin/healthcheck.sh

# Create logs directory and set ownership BEFORE switching to non-root user
RUN mkdir -p /app/logs && chown -R node:node /app

# Switch to non-root user
USER node

# Expose the application port
EXPOSE 5000

# Environment defaults (can be overridden in docker-compose or at runtime)
ENV NODE_ENV=production \
    API_PORT=5000

# Health check — Docker will probe this every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Entrypoint: wait for DB, run migrations, then start
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command
CMD ["node", "dist/index.js"]
