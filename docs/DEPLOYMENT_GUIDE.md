# 📦 StudyForge — End-to-End Deployment Guide

> Complete, step-by-step instructions for deploying StudyForge to production.  
> Covers **three deployment paths**: Managed PaaS (Railway/Render), VPS with Docker, and Manual VPS.

---

## Table of Contents

- [Prerequisites](#-prerequisites)
- [Path A: Railway (Recommended — Easiest)](#-path-a-railway-recommended--easiest)
- [Path B: Render](#-path-b-render)
- [Path C: VPS with Docker Compose + CI/CD](#-path-c-vps-with-docker-compose--cicd)
- [Path D: Manual VPS (No Docker)](#-path-d-manual-vps-no-docker)
- [Post-Deployment Checklist](#-post-deployment-checklist)
- [Custom Domain & SSL](#-custom-domain--ssl)
- [Monitoring & Maintenance](#-monitoring--maintenance)
- [Troubleshooting](#-troubleshooting)
- [Environment Variables Reference](#-environment-variables-reference)

---

## 🔑 Prerequisites

Before starting **any** deployment path, you need these accounts and credentials ready.

### Required Accounts

| Service | Purpose | Free Tier? | Link |
|---------|---------|------------|------|
| **GitHub** | Source code hosting | ✅ | [github.com](https://github.com) |
| **Google AI Studio** | Gemini API key | ✅ (free tier) | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |

### Optional Accounts (Recommended)

| Service | Purpose | Free Tier? | Link |
|---------|---------|------------|------|
| **Gmail App Password** | SMTP for email verification & password reset | ✅ | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |
| **JDoodle** | Code execution in Code Generator | ✅ (200 req/day) | [jdoodle.com/compiler-api](https://www.jdoodle.com/compiler-api) |
| **Cloudinary** | Image storage & optimization | ✅ (25 credits/mo) | [cloudinary.com/console](https://cloudinary.com/console) |

### Generate Secrets Locally

Run these on your terminal **now** and save the output — you'll need them in every path:

```bash
# Generate JWT_SECRET (required — minimum 32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **Save both outputs somewhere safe.** You will paste these into environment variable fields during deployment.

---

## 🚂 Path A: Railway (Recommended — Easiest)

**Best for:** Solo developers who want zero DevOps overhead.  
**Cost:** Free tier available (limited hours), Hobby plan $5/month.  
**Time to deploy:** ~10 minutes.

### Step 1: Create a Railway Account

1. Go to [railway.app](https://railway.app) and sign up with GitHub.
2. Allow Railway to access your `Dipendra2003/StudyForge` repository.

### Step 2: Create a New Project

1. Click **"New Project"** → **"Deploy from GitHub Repo"**.
2. Select **`Dipendra2003/StudyForge`**.
3. Railway will auto-detect the `Dockerfile` and begin building. **Do NOT deploy yet** — you need to add services first.

### Step 3: Add PostgreSQL

1. In the same project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**.
2. Railway will provision a PostgreSQL 16 instance and expose a `DATABASE_URL` variable automatically.
3. Click on the PostgreSQL service → **"Variables"** tab → copy the `DATABASE_URL` value.

### Step 4: Add Redis

1. Click **"+ New"** → **"Database"** → **"Add Redis"**.
2. Railway provisions Redis and creates a `REDIS_URL` variable.
3. Copy the `REDIS_URL` value.

### Step 5: Configure Environment Variables

1. Click on the **StudyForge app service** (not the databases).
2. Go to the **"Variables"** tab.
3. Click **"Raw Editor"** and paste the following (replace placeholders):

```env
# Database (Railway auto-injects DATABASE_URL, but add explicitly if needed)
DATABASE_URL=<paste the PostgreSQL DATABASE_URL from Step 3>

# Redis
REDIS_HOST=<extract host from REDIS_URL>
REDIS_PORT=<extract port from REDIS_URL>
REDIS_PASSWORD=<extract password from REDIS_URL>

# Server
NODE_ENV=production
API_PORT=5000
PORT=5000

# Authentication (REQUIRED — paste your generated secrets)
JWT_SECRET=<paste your 64-char hex from Prerequisites>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
SESSION_SECRET=<paste your second 64-char hex>

# AI (REQUIRED)
GEMINI_API_KEY=<your Gemini API key>

# Application URLs (update after you get your Railway URL)
APP_URL=https://your-app.up.railway.app
FRONTEND_URL=https://your-app.up.railway.app
CORS_ORIGINS=https://your-app.up.railway.app

# Email (Optional but recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your Gmail>
SMTP_PASSWORD=<your Gmail App Password>
SMTP_FROM_NAME=StudyForge
SMTP_FROM_EMAIL=noreply@studyforge.com

# Code Execution (Optional)
JDOODLE_CLIENT_ID=<your JDoodle client ID>
JDOODLE_CLIENT_SECRET=<your JDoodle client secret>

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME=<your cloud name>
CLOUDINARY_API_KEY=<your API key>
CLOUDINARY_API_SECRET=<your API secret>
CLOUDINARY_FOLDER=studyforge

# Security
BCRYPT_ROUNDS=12
MAX_FILE_SIZE_MB=10
MAX_IMAGE_SIZE_MB=5
```

### Step 6: Deploy

1. Click **"Deploy"** on the app service.
2. Railway builds the Docker image using your `Dockerfile` (multi-stage build).
3. Watch the build logs — it should take 3–5 minutes.
4. Once deployed, Railway gives you a public URL like `https://studyforge-production.up.railway.app`.

### Step 7: Push Database Schema

Railway doesn't auto-run migrations. You have two options:

**Option A — Use Railway's terminal:**
1. Click the app service → **"Terminal"** tab.
2. Run:
   ```bash
   npx drizzle-kit push
   ```

**Option B — Run locally pointing to Railway's DB:**
1. Copy the `DATABASE_URL` from Railway.
2. Run locally:
   ```bash
   DATABASE_URL="<railway-db-url>" npx drizzle-kit push
   ```

### Step 8: Create Admin Account

In Railway's terminal (or locally with Railway's DATABASE_URL):

```bash
npx tsx scripts/create-admin.ts
```

### Step 9: Verify Deployment

1. Visit your Railway URL.
2. You should see the StudyForge landing page with "Your AI Study Assistant For Success".
3. Register a new account, verify email, and test flashcard generation.

### Step 10: Update APP_URL

1. Go back to **Variables** and update:
   ```
   APP_URL=https://<your-actual-railway-url>.up.railway.app
   FRONTEND_URL=https://<your-actual-railway-url>.up.railway.app
   CORS_ORIGINS=https://<your-actual-railway-url>.up.railway.app
   ```
2. Railway will auto-redeploy.

> ✅ **Done!** Your app is live on Railway with auto-deployments on every push to `main`.

---

## 🎨 Path B: Render

**Best for:** Developers who want a free tier with slightly more control than Railway.  
**Cost:** Free tier available (spins down after 15 min inactivity), paid plans from $7/month.  
**Time to deploy:** ~15 minutes.

### Step 1: Create a Render Account

1. Go to [render.com](https://render.com) and sign up with GitHub.

### Step 2: Create PostgreSQL Database

1. Click **"New +"** → **"PostgreSQL"**.
2. Configure:
   - **Name:** `studyforge-db`
   - **Database:** `studyforge`
   - **User:** `studyforge_user`
   - **Region:** Choose closest to your users (e.g., Singapore for India)
   - **Plan:** Free (90-day limit) or Starter ($7/mo)
3. Click **"Create Database"**.
4. Wait for provisioning, then copy the **External Database URL** from the dashboard.

### Step 3: Create Redis Instance

1. Click **"New +"** → **"Redis"**.
2. Configure:
   - **Name:** `studyforge-redis`
   - **Plan:** Free (25 MB) or Starter
   - **Max Memory Policy:** `allkeys-lru`
3. Copy the **Internal URL** (format: `redis://red-xxxxx:6379`).

### Step 4: Create Web Service

1. Click **"New +"** → **"Web Service"**.
2. Connect your GitHub repository: `Dipendra2003/StudyForge`.
3. Configure:
   - **Name:** `studyforge`
   - **Region:** Same as your database
   - **Runtime:** **Docker**
   - **Instance Type:** Free or Starter ($7/mo)
   - **Branch:** `main`
4. **Do NOT click "Create" yet** — add environment variables first.

### Step 5: Add Environment Variables

In the web service creation page, scroll to **"Environment Variables"** and add all the same variables from [Path A, Step 5](#step-5-configure-environment-variables), with these Render-specific changes:

```env
# Use the Render PostgreSQL External URL
DATABASE_URL=<paste Render PostgreSQL External URL>

# Use the Render Redis Internal URL
REDIS_HOST=<extract host from Render Redis URL>
REDIS_PORT=6379

# URLs (update after deploy)
APP_URL=https://studyforge.onrender.com
FRONTEND_URL=https://studyforge.onrender.com
CORS_ORIGINS=https://studyforge.onrender.com
```

### Step 6: Deploy

1. Click **"Create Web Service"**.
2. Render pulls your code, builds the Docker image, and deploys.
3. Build takes 5–8 minutes. Watch logs for errors.
4. Your URL will be: `https://studyforge.onrender.com`.

### Step 7: Push Database Schema

Use Render's **Shell** tab in the web service dashboard:

```bash
npx drizzle-kit push
```

Or run locally:
```bash
DATABASE_URL="<render-external-db-url>" npx drizzle-kit push
```

### Step 8: Create Admin & Verify

```bash
# In Render Shell
npx tsx scripts/create-admin.ts
```

Visit your Render URL and verify everything works.

> ⚠️ **Free tier warning:** Render free web services spin down after 15 minutes of inactivity. First visit after spin-down takes ~30 seconds to cold-start. Upgrade to Starter ($7/mo) for always-on.

---

## 🐳 Path C: VPS with Docker Compose + CI/CD

**Best for:** Production deployments with full control, auto-deploy on `git push`, and auto-rollback.  
**Cost:** $4–$6/month for a VPS.  
**Time to deploy:** ~30–45 minutes (first time), then auto-deploys on every push.

### Step 1: Provision a VPS

Choose a provider and create a server:

| Provider | Cheapest Plan | Recommended Spec | Link |
|----------|--------------|-----------------|------|
| **Hetzner** | $4.15/mo | 2 vCPU, 4 GB RAM, 40 GB SSD | [hetzner.com/cloud](https://www.hetzner.com/cloud) |
| **DigitalOcean** | $6/mo | 1 vCPU, 1 GB RAM, 25 GB SSD | [digitalocean.com](https://www.digitalocean.com) |
| **AWS Lightsail** | $5/mo | 1 vCPU, 1 GB RAM, 40 GB SSD | [lightsail.aws.amazon.com](https://lightsail.aws.amazon.com) |
| **Hostinger VPS** | $4.99/mo | 1 vCPU, 4 GB RAM | [hostinger.com](https://www.hostinger.com/vps-hosting) |

**Server setup:**
- **OS:** Ubuntu 22.04 LTS or 24.04 LTS
- **Region:** Mumbai (ap-south-1) for Indian users
- **SSH Key:** Add your public key during creation

### Step 2: SSH into Your Server

```bash
ssh root@<your-server-ip>
```

### Step 3: Install Docker & Docker Compose

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
docker compose version

# (Optional) Add non-root user
adduser deploy
usermod -aG docker deploy
```

### Step 4: Clone Your Repository on the Server

```bash
cd ~
git clone https://github.com/Dipendra2003/StudyForge.git
cd StudyForge
```

### Step 5: Create the `.env` File on the Server

```bash
cp .env.example .env
nano .env
```

Fill in **all required variables** (refer to [Environment Variables Reference](#-environment-variables-reference)):

```env
# REQUIRED
DATABASE_URL=postgres://postgres:Postgremmudip76@db:5432/studyforge
JWT_SECRET=<your-generated-64-char-hex>
GEMINI_API_KEY=<your-gemini-key>
NODE_ENV=production
API_PORT=5000

# URLs — replace with your domain or IP
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# Session
SESSION_SECRET=<your-generated-64-char-hex>

# Email (recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-email@gmail.com>
SMTP_PASSWORD=<your-gmail-app-password>
SMTP_FROM_NAME=StudyForge
SMTP_FROM_EMAIL=noreply@studyforge.com

# Code Execution (optional)
JDOODLE_CLIENT_ID=<your-id>
JDOODLE_CLIENT_SECRET=<your-secret>

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
CLOUDINARY_FOLDER=studyforge

# Security
BCRYPT_ROUNDS=12
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

### Step 6: Set Up SSL Certificates (Before First Deploy)

```bash
# Install Certbot
apt install certbot -y

# Generate SSL certificate (replace with your domain)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to the nginx/certs directory
mkdir -p ~/StudyForge/nginx/certs
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ~/StudyForge/nginx/certs/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ~/StudyForge/nginx/certs/
```

> 💡 **If you don't have a domain yet**, create self-signed certs for testing:
> ```bash
> mkdir -p ~/StudyForge/nginx/certs
> openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
>   -keyout ~/StudyForge/nginx/certs/privkey.pem \
>   -out ~/StudyForge/nginx/certs/fullchain.pem \
>   -subj "/CN=localhost"
> ```

### Step 7: Deploy with Docker Compose

```bash
cd ~/StudyForge

# Build and start all services (detached mode)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This starts **4 containers**:
- `studyforge-app` — Node.js server (port 5000, internal only)
- `studyforge-db` — PostgreSQL 16 (port 5432, internal only)
- `studyforge-redis` — Redis 7 (port 6379, internal only)
- `studyforge-nginx` — Nginx reverse proxy (ports 80 & 443, public)

### Step 8: Push Database Schema

```bash
# Enter the app container
docker exec -it studyforge-app sh

# Run migrations
npx drizzle-kit push

# Create admin account
npx tsx scripts/create-admin.ts

# Exit container
exit
```

### Step 9: Verify Deployment

```bash
# Check all containers are healthy
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Check app logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app

# Test the health endpoint
curl http://localhost:5000/api/health
```

Visit `https://yourdomain.com` (or `http://<server-ip>` if no domain).

### Step 10: Set Up GitHub Actions CI/CD (Auto-Deploy on Push)

Your repository already includes a complete CI/CD pipeline. You just need to add secrets:

1. Go to **GitHub → Repository → Settings → Secrets and variables → Actions**.
2. Add these secrets:

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | Your VPS IP address (e.g., `198.51.100.1`) |
| `SERVER_USERNAME` | `root` (or your deploy user) |
| `SERVER_SSH_KEY` | Your **private** SSH key (the full key including `-----BEGIN...`) |
| `SERVER_FINGERPRINT` | Run `ssh-keyscan -H <server-ip>` locally and paste the output |
| `WEBHOOK_URL` | *(Optional)* Discord/Slack webhook for deploy notifications |

3. Set up the **GitHub Environment**:
   - Go to **Settings → Environments → New environment → "production"**.
   - *(Optional)* Enable **Required reviewers** for manual approval before deploys.

4. **Test the pipeline:**
   ```bash
   git add .
   git commit -m "test: trigger CI/CD pipeline"
   git push origin main
   ```

5. Go to **GitHub → Actions** tab and watch the pipeline:
   - `Source Code Security Scan` (Trivy) → `Build Image` (GHCR) → `Deploy to Production` (SSH)

> ✅ **Done!** Every push to `main` now automatically: scans for vulnerabilities → builds a Docker image → pushes to GitHub Container Registry → SSHs into your server → pulls the new image → deploys with health checks → auto-rolls back on failure.

### Useful Docker Commands

```bash
# View logs (follow mode)
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app

# Restart all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart

# Stop everything
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# Rebuild and restart (after code changes)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Check resource usage
docker stats

# Enter PostgreSQL shell
docker exec -it studyforge-db psql -U postgres -d studyforge

# Enter Redis CLI
docker exec -it studyforge-redis redis-cli
```

---

## 🔧 Path D: Manual VPS (No Docker)

**Best for:** If Docker is not available or you want maximum control.  
**Cost:** Same VPS cost as Path C.  
**Time to deploy:** ~45–60 minutes.

### Step 1: Provision VPS & SSH In

Same as [Path C, Steps 1–2](#step-1-provision-a-vps).

### Step 2: Install System Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify
node --version   # Should be >= 20.x
npm --version    # Should be >= 10.x

# Install PostgreSQL 16
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server

# Install Nginx
apt install -y nginx

# Install build tools (needed for bcrypt native module)
apt install -y build-essential python3
```

### Step 3: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In the PostgreSQL shell:
CREATE DATABASE studyforge;
CREATE USER studyforge_user WITH ENCRYPTED PASSWORD 'your-strong-password-here';
GRANT ALL PRIVILEGES ON DATABASE studyforge TO studyforge_user;
ALTER DATABASE studyforge OWNER TO studyforge_user;

# Grant schema privileges (PostgreSQL 15+ requires this)
\c studyforge
GRANT ALL ON SCHEMA public TO studyforge_user;

\q
```

### Step 4: Configure Redis

```bash
# Edit Redis config
nano /etc/redis/redis.conf

# Set these values:
# maxmemory 128mb
# maxmemory-policy allkeys-lru
# appendonly yes

# Restart Redis
systemctl restart redis-server
systemctl enable redis-server
```

### Step 5: Clone & Build the Application

```bash
# Create app directory
mkdir -p /var/www
cd /var/www
git clone https://github.com/Dipendra2003/StudyForge.git
cd StudyForge

# Install dependencies
npm ci --legacy-peer-deps

# Create .env
cp .env.example .env
nano .env
```

Set these in `.env`:
```env
DATABASE_URL=postgres://studyforge_user:your-strong-password-here@localhost:5432/studyforge
JWT_SECRET=<your-64-char-hex>
GEMINI_API_KEY=<your-key>
NODE_ENV=production
API_PORT=5000
SESSION_SECRET=<your-64-char-hex>
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
REDIS_HOST=localhost
REDIS_PORT=6379
# ... add all other variables from .env.example
```

```bash
# Build the application
npm run build

# Push database schema
npx drizzle-kit push

# Create admin
npx tsx --env-file=.env scripts/create-admin.ts
```

### Step 6: Set Up PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/index.js --name studyforge --env production

# Save PM2 config so it restarts on server reboot
pm2 save
pm2 startup  # Follow the printed command to enable on boot
```

### Step 7: Configure Nginx as Reverse Proxy

```bash
nano /etc/nginx/sites-available/studyforge
```

Paste:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS (after certbot setup)
    # return 301 https://$host$request_uri;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Timeouts for AI requests
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_connect_timeout 10s;

        # Buffering for large AI responses
        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 8 32k;
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Block access to dotfiles
    location ~ /\. {
        deny all;
        return 404;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/studyforge /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

### Step 8: Set Up SSL with Certbot

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (auto-configures Nginx)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Verify with:
certbot renew --dry-run
```

### Step 9: Set Up Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

### Step 10: Verify

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs studyforge

# Test health
curl http://localhost:5000/api/health
```

Visit `https://yourdomain.com`.

### Updating (Manual Deploys)

```bash
cd /var/www/StudyForge
git pull origin main
npm ci --legacy-peer-deps
npm run build
pm2 restart studyforge
```

---

## ✅ Post-Deployment Checklist

Run through this checklist after deploying via **any** path:

### Functionality Tests

- [ ] **Landing page loads** — Hero section shows "Your AI Study Assistant For Success"
- [ ] **Registration works** — Create a new account
- [ ] **Email verification** — Receive and click verification email (if SMTP configured)
- [ ] **Login works** — Sign in with your new account
- [ ] **Dashboard loads** — See the main dashboard with stats
- [ ] **Flashcard generation** — Create a flashcard deck → "Generate with AI" → Enter a topic → Cards appear
- [ ] **Quiz mode** — Start a quiz → Answer questions → See results
- [ ] **AI Chat** — Open Chat → Send a message → Receive AI response
- [ ] **Document summarization** — Upload a PDF → Get summary
- [ ] **Code Generator** — Generate code → Run it (if JDoodle configured)
- [ ] **Study Planner** — Create a study plan
- [ ] **Profile page** — Update profile picture and settings
- [ ] **Admin panel** — Login with admin account → Access `/admin` routes

### Security Tests

- [ ] **HTTPS works** — No mixed content warnings
- [ ] **HTTP redirects to HTTPS** — Visiting `http://` redirects to `https://`
- [ ] **Security headers present** — Check at [securityheaders.com](https://securityheaders.com)
- [ ] **Rate limiting works** — Rapid API requests return `429 Too Many Requests`
- [ ] **CORS configured** — API rejects requests from unknown origins
- [ ] **JWT expiry** — Access token expires after 15 minutes, refresh token works

### Performance Tests

- [ ] **Page load time** — Under 3 seconds on first load
- [ ] **API response time** — Under 200ms for non-AI endpoints
- [ ] **Gzip enabled** — Check response headers for `Content-Encoding: gzip`

---

## 🌐 Custom Domain & SSL

### Pointing Your Domain

1. **Buy a domain** (Namecheap, GoDaddy, Cloudflare, Google Domains, etc.).

2. **Add DNS records:**

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | `A` | `@` | `<your-server-ip>` | 300 |
   | `A` | `www` | `<your-server-ip>` | 300 |
   | `CNAME` | `www` | `yourdomain.com` | 300 |

   > For Railway/Render: Use a `CNAME` record pointing to the platform-provided URL instead of an `A` record.

3. **Update environment variables:**
   ```env
   APP_URL=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

### SSL for Railway/Render

Both platforms provide **automatic SSL** with Let's Encrypt. Just add your custom domain in their dashboard:

- **Railway:** Project → Settings → Domains → Add Custom Domain
- **Render:** Service → Settings → Custom Domains → Add Custom Domain

### SSL for VPS (Already Covered)

See [Path C, Step 6](#step-6-set-up-ssl-certificates-before-first-deploy) or [Path D, Step 8](#step-8-set-up-ssl-with-certbot).

### Auto-Renewal (VPS Only)

```bash
# Certbot sets up auto-renewal automatically. Verify with:
certbot renew --dry-run

# If not, add a cron job:
crontab -e
# Add this line:
0 0 1 * * certbot renew --quiet && systemctl reload nginx
```

---

## 📊 Monitoring & Maintenance

### Health Checks

The app exposes a health endpoint at `/api/health`. Use it for monitoring:

```bash
# Quick check
curl -s https://yourdomain.com/api/health | jq

# Automated monitoring with cron (every 5 minutes)
*/5 * * * * curl -sf https://yourdomain.com/api/health > /dev/null || echo "StudyForge is DOWN!" | mail -s "ALERT" you@email.com
```

### Uptime Monitoring (Free Services)

| Service | Free Tier | Link |
|---------|----------|------|
| **UptimeRobot** | 50 monitors, 5-min checks | [uptimerobot.com](https://uptimerobot.com) |
| **Better Stack** | 10 monitors, 3-min checks | [betterstack.com](https://betterstack.com) |
| **Cronitor** | 5 monitors | [cronitor.io](https://cronitor.io) |

Set up a monitor pointing to `https://yourdomain.com/api/health`.

### Log Management (VPS)

```bash
# Docker Compose logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=100 app

# PM2 logs (Path D)
pm2 logs studyforge --lines 100

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

### Database Backups (VPS)

```bash
# Create a backup script
cat > ~/backup-studyforge.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Docker method
docker exec studyforge-db pg_dump -U postgres studyforge | gzip > "$BACKUP_DIR/studyforge_$TIMESTAMP.sql.gz"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: studyforge_$TIMESTAMP.sql.gz"
EOF

chmod +x ~/backup-studyforge.sh

# Schedule daily backup at 2 AM
crontab -e
# Add:
0 2 * * * /root/backup-studyforge.sh >> /var/log/studyforge-backup.log 2>&1
```

### Updating the Application (VPS Docker)

```bash
cd ~/StudyForge
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> If you set up CI/CD (Path C, Step 10), this happens automatically on `git push`.

---

## 🔍 Troubleshooting

### Common Issues

#### 1. `FATAL: password authentication failed for user`

**Cause:** Wrong database credentials in `.env`.

**Fix:**
```bash
# Docker: The database password is set in docker-compose.yml
# Check: docker-compose.yml line 100 → POSTGRES_PASSWORD
# Make sure your DATABASE_URL in .env matches

# Manual: Reset PostgreSQL password
sudo -u postgres psql -c "ALTER USER studyforge_user WITH PASSWORD 'new-password';"
```

#### 2. `Error: GEMINI_API_KEY is required`

**Cause:** Missing or invalid Gemini API key.

**Fix:**
1. Get a key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Add to `.env`: `GEMINI_API_KEY=AIza...`
3. Restart the app.

#### 3. `ECONNREFUSED` or `connection refused` (Redis)

**Cause:** Redis is not running or not accessible.

**Fix:**
```bash
# Docker
docker compose ps redis  # Check if it's running
docker compose restart redis

# Manual
systemctl status redis-server
systemctl start redis-server
```

> StudyForge falls back to in-memory caching if Redis is unavailable, so this is not fatal.

#### 4. Build fails with `npm ERR! ERESOLVE`

**Cause:** Dependency version conflicts.

**Fix:**
```bash
npm ci --legacy-peer-deps
```

#### 5. `502 Bad Gateway` from Nginx

**Cause:** The Node.js app isn't running or hasn't finished starting.

**Fix:**
```bash
# Docker
docker compose logs -f app  # Check for startup errors

# PM2
pm2 logs studyforge
pm2 restart studyforge
```

#### 6. AI requests timeout (504 Gateway Timeout)

**Cause:** Gemini API takes too long, or Nginx proxy timeout is too short.

**Fix:** The Nginx config already sets `proxy_read_timeout 120s`. If still timing out:
```bash
# Increase timeout in nginx config
proxy_read_timeout 180s;
proxy_send_timeout 180s;
```

#### 7. Email verification not working

**Cause:** SMTP credentials incorrect or Gmail blocking.

**Fix:**
1. Ensure you're using a **Gmail App Password**, not your regular password.
2. Generate at: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Check email logs in the app's console output.

#### 8. `Container studyforge-app is not healthy`

**Cause:** The app failed to start inside Docker.

**Fix:**
```bash
# Check what happened
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=200 app

# Common causes:
# - Missing required env vars (JWT_SECRET, GEMINI_API_KEY)
# - Database not ready (check db container health)
# - Port conflict (another process on port 5000)
```

---

## 📋 Environment Variables Reference

### Required (App Will NOT Start Without These)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/studyforge` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `<64-char hex string>` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |

### Strongly Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `API_PORT` | Server port | `5000` |
| `APP_URL` | Full application URL | `http://localhost:5000` |
| `FRONTEND_URL` | Frontend URL (same as APP_URL for monolith) | `http://localhost:5000` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | *(empty = permissive in dev)* |
| `SESSION_SECRET` | Session signing secret | `change-me-in-production` |

### Email (Optional but Recommended)

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS on connect (port 465) | `false` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASSWORD` | SMTP password / app password | — |
| `SMTP_FROM_NAME` | Sender display name | `StudyForge` |
| `SMTP_FROM_EMAIL` | Sender email address | `noreply@studyforge.com` |
| `ADMIN_EMAIL` | Admin email for contact form | — |

### Redis (Optional — Falls Back to In-Memory)

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | *(empty)* |

### External APIs (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `JDOODLE_CLIENT_ID` | JDoodle compiler API client ID | — |
| `JDOODLE_CLIENT_SECRET` | JDoodle compiler API secret | — |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | — |
| `CLOUDINARY_API_KEY` | Cloudinary API key | — |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | — |
| `CLOUDINARY_FOLDER` | Upload folder name | `studyforge` |

### Security (Optional — Sensible Defaults)

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_ACCESS_EXPIRY` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `7d` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `MAX_FILE_SIZE_MB` | Max upload file size | `10` |
| `MAX_IMAGE_SIZE_MB` | Max image upload size | `5` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `5` |
| `MAX_FAILED_LOGIN_ATTEMPTS` | Failed logins before lockout | `10` |
| `ACCOUNT_LOCKOUT_DURATION_MINUTES` | Lockout duration | `60` |
| `ENABLE_VIRUS_SCAN` | Enable ClamAV file scanning | `false` |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      INTERNET                            │
│                         │                                │
│                    ┌────▼────┐                           │
│                    │  Nginx  │ :80 / :443                │
│                    │ (Proxy) │ SSL termination            │
│                    └────┬────┘ Gzip, Rate limiting        │
│                         │                                │
│                    ┌────▼────┐                           │
│                    │ Node.js │ :5000 (internal)           │
│                    │ Express │                            │
│                    │  + Vite │ Serves React SPA           │
│                    └────┬────┘                            │
│                    ┌────┴────┐                           │
│               ┌────▼──┐  ┌──▼────┐                      │
│               │ Pgsql │  │ Redis │                       │
│               │  :5432│  │ :6379 │                       │
│               └───────┘  └───────┘                       │
│                                                          │
│          ┌──────────────────────────┐                    │
│          │     External APIs        │                    │
│          │  • Google Gemini AI      │                    │
│          │  • JDoodle Compiler      │                    │
│          │  • Cloudinary CDN        │                    │
│          │  • Gmail SMTP            │                    │
│          └──────────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline Flow

```
git push main
    │
    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│ Trivy Scan   │───▶│ Docker Build │───▶│ SSH Deploy       │
│ (Vuln Check) │    │ + Push GHCR  │    │ + Health Check   │
└──────────────┘    └──────────────┘    │ + Auto-Rollback  │
                                         └──────────────────┘
```

---

<div align="center">

**Made with ❤️ by Dipendra Kumar**

[GitHub](https://github.com/Dipendra2003/StudyForge) · [Portfolio](https://portfolio-dipendra.vercel.app/)

</div>
