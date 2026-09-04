# 📦 StudyForge — Production Deployment Guide

> Clean, verified, step-by-step instructions for deploying StudyForge.
> Built for the unified fullstack architecture: React 18 frontend + Node.js/Express backend served together as a single service.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Prerequisites & Secrets Generation](#-prerequisites--secrets-generation)
- [Option 1: Render + Neon DB (Recommended Free Tier)](#-option-1-render--neon-db-recommended-free-tier)
- [Option 2: Railway (Easiest All-in-One PaaS)](#-option-2-railway-easiest-all-in-one-paas)
- [Option 3: VPS with Docker Compose & CI/CD](#-option-3-vps-with-docker-compose--cicd)
- [Database Setup & Admin Provisioning](#-database-setup--admin-provisioning)
- [Database Backup & Disaster Recovery](#-database-backup--disaster-recovery)
- [Environment Variables Reference](#-environment-variables-reference)
- [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🏗️ Architecture Overview

StudyForge is structured as a **single fullstack application**:
- **Frontend:** React 18 + Vite, compiled to static assets (`dist/public`).
- **Backend:** Node.js + Express (v4.21) written in TypeScript, compiled to `dist/index.js`. In production, Express directly serves the React SPA, meaning **you only deploy ONE service** with zero cross-origin (CORS) issues.
- **Database (Mandatory):** PostgreSQL 14+ via Drizzle ORM and `postgres-js`.
- **Cache / Quota Store (Optional):** Redis 7+ for distributed caching and rate-limiting. If Redis is omitted, the server **automatically falls back to in-memory caching** with zero errors.

---

## 🔑 Prerequisites & Secrets Generation

Before deploying, generate two secure 64-character random secrets on your machine:

```bash
# Generate JWT_SECRET (required — minimum 32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET (required)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save both strings safely. You will paste them into your deployment environment variables.

---

## 🚀 Option 1: Render + Neon DB (Recommended Free Tier)

This is the most cost-effective and reliable free-tier setup:
- **Neon DB:** Permanent free serverless PostgreSQL (no 90-day deletion).
- **Render:** Free Web Service running the fullstack Docker container.

### Step 1: Create Neon PostgreSQL Database
1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Create a new project (e.g., `studyforge`).
3. Copy the provided connection string:
   ```text
   postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   *(This is your `DATABASE_URL`)*.

### Step 2: Push Database Schema to Neon
From your local terminal, push all 33 tables directly to Neon:
```bash
# Windows PowerShell
$env:DATABASE_URL="<your-neon-connection-string>"
npx drizzle-kit push

# macOS / Linux
DATABASE_URL="<your-neon-connection-string>" npx drizzle-kit push
```

### Step 3: Create Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**.
2. Connect your repository: `Dipendra2003/StudyForge`.
3. Configure settings:
   - **Name:** `studyforge`
   - **Region:** Choose closest to your users (e.g., Singapore or Frankfurt)
   - **Runtime:** **Docker** *(Render detects the repository `Dockerfile`)*
   - **Branch:** `main`
   - **Instance Type:** Free

### Step 4: Add Environment Variables in Render
Under **Environment Variables**, add:

| Key | Value | Note |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Required |
| `PORT` | `5000` | Required |
| `DATABASE_URL` | `<paste your Neon PostgreSQL connection string>` | Required |
| `JWT_SECRET` | `<your generated 64-character hex secret>` | Required |
| `SESSION_SECRET` | `<your generated 64-character hex secret>` | Required |
| `GEMINI_API_KEY` | `<your Google AI Studio API key>` | Required for AI |
| `APP_URL` | `https://studyforge.onrender.com` | Update to your actual Render URL |
| `FRONTEND_URL` | `https://studyforge.onrender.com` | Update to your actual Render URL |
| `CORS_ORIGINS` | `https://studyforge.onrender.com` | Update to your actual Render URL |

*(Optional variables: SMTP email, JDoodle, Cloudinary can be added if desired).*

### Step 5: Deploy & Create Admin
1. Click **Create Web Service**. Wait 4–6 minutes for the Docker build to finish.
2. Once the app is running, open the **Shell** tab in the Render dashboard and run:
   ```bash
   npx tsx scripts/create-admin.ts
   ```
3. Follow the prompt to set your admin email and password.
4. Visit `https://studyforge.onrender.com` — your app is live!

---

## 🚂 Option 2: Railway (Easiest All-in-One PaaS)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. In the same project canvas, click **+ New** → **Database** → **Add PostgreSQL**.
3. (Optional) Click **+ New** → **Database** → **Add Redis**.
4. In your StudyForge app service, go to **Variables** and add:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `REDIS_URL`: `${{Redis.REDIS_URL}}` (if Redis added)
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `JWT_SECRET`: `<your 64-char hex>`
   - `SESSION_SECRET`: `<your 64-char hex>`
   - `GEMINI_API_KEY`: `<your Gemini key>`
   - `APP_URL`: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
   - `FRONTEND_URL`: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
   - `CORS_ORIGINS`: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
5. Railway will automatically build the `Dockerfile`.
6. Use the Railway **Terminal** tab to push schema and create admin:
   ```bash
   npx drizzle-kit push
   npx tsx scripts/create-admin.ts
   ```

---

## 🐳 Option 3: VPS with Docker Compose & CI/CD

Best for production hosting with full root control (Ubuntu 22.04 / 24.04).

### Step 1: Install Docker on the Server
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Step 2: Clone Repository & Configure Environment
```bash
git clone https://github.com/Dipendra2003/StudyForge.git /var/www/StudyForge
cd /var/www/StudyForge

cp .env.example .env
nano .env
```
Fill in your secure values:
- `DATABASE_URL=postgres://postgres:<your_secure_db_password>@db:5432/studyforge`
- `POSTGRES_PASSWORD=<your_secure_db_password>`
- `JWT_SECRET=<your_64_char_secret>`
- `SESSION_SECRET=<your_64_char_secret>`
- `GEMINI_API_KEY=<your_gemini_key>`
- `APP_URL=https://yourdomain.com`

### Step 3: Run with Docker Compose
```bash
# Start all containers in background
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Run schema push and create admin
docker compose exec app npx drizzle-kit push
docker compose exec app npx tsx scripts/create-admin.ts
```

### Step 4: GitHub Actions Auto-Deployment
To enable automatic deployment on every `git push origin main`:
1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**.
2. Add the following secrets:
   - `SERVER_HOST`: VPS IP address or domain
   - `SERVER_USERNAME`: `root` or deploy user
   - `SERVER_SSH_KEY`: Private SSH key
   - `SERVER_FINGERPRINT`: Output of `ssh-keyscan -H <SERVER_HOST>`
3. Every push to `main` will run tests, compile images, push to GHCR, and deploy via SSH with automatic healthcheck verification and rollback on failure.

---

## 🛠️ Database Setup & Admin Provisioning

### Pushing Schema Changes
StudyForge uses **Drizzle ORM**. Any schema change in `shared/schema.ts` is applied safely using:
```bash
npx drizzle-kit push
```

### Creating Admin User
To provision the initial administrator account:
```bash
npx tsx scripts/create-admin.ts
```

---

## 💾 Database Backup & Disaster Recovery

StudyForge includes production-grade backup and restore scripts in `scripts/`.

### 1. Create a Database Backup
```bash
# Automated backup (compressed with gzip, auto-detects container or remote DB)
npm run db:backup

# Output saved to: backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

### 2. Restore from a Backup
```bash
# Interactive restore with safety confirmation
npm run db:restore backups/backup_YYYYMMDD_HHMMSS.sql.gz
```

### 3. Automated Nightly Cron Job (VPS)
Add to your server crontab (`crontab -e`):
```bash
0 3 * * * /bin/bash /var/www/StudyForge/scripts/backup-db.sh >> /var/log/studyforge-backup.log 2>&1
```

---

## 📋 Environment Variables Reference

### Mandatory Variables
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `JWT_SECRET` | JWT authentication signing key (minimum 32 characters) |
| `SESSION_SECRET` | Session cookie signing secret |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `NODE_ENV` | `production` |
| `PORT` | Server listening port (default `5000`) |

### Recommended URL Configuration
| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_URL` | Full public URL of the deployed application | `http://localhost:5000` |
| `FRONTEND_URL` | Public frontend URL (matches `APP_URL`) | `http://localhost:5000` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins | Matches `APP_URL` |

### Optional Integrations
| Variable | Description | Default |
| :--- | :--- | :--- |
| `REDIS_URL` / `REDIS_HOST` | Redis connection info | Falls back to in-memory |
| `SMTP_HOST` | SMTP server host (e.g., `smtp.gmail.com`) | Disabled if empty |
| `SMTP_PORT` | SMTP server port (`587`) | `587` |
| `SMTP_USER` | SMTP username | Empty |
| `SMTP_PASSWORD` | SMTP app password | Empty |
| `JDOODLE_CLIENT_ID` | JDoodle API client ID for Code Studio | Disabled if empty |
| `JDOODLE_CLIENT_SECRET` | JDoodle API client secret | Disabled if empty |

---

## 🔍 Troubleshooting & FAQ

### 1. Does the server require Redis to run?
**No.** Redis is optional. If Redis is not running or credentials are not supplied, the backend seamlessly falls back to memory for rate-limiting, quiz caching, and AI quota tracking without crashing.

### 2. Why do I see a 503 during cold boots on Render Free Tier?
Render's free tier spins down after 15 minutes of inactivity. The first request after spin-down takes 30–45 seconds to wake up the Docker container. Upgrading to the Starter plan ($7/mo) provides an always-on instance.

### 3. How do I verify the server health?
Check the healthcheck endpoint:
```bash
curl https://<your-app-url>/api/health
```
A healthy server returns `{"status":"ok","timestamp":"..."}` with HTTP 200.
