# 🚀 StudyForge — CI/CD & Deployment Architecture

This repository uses a fully automated, Enterprise-Grade DevSecOps pipeline using GitHub Actions, tailored for automated testing, security scanning, and deployment.

For complete step-by-step guides across **Render + Neon DB**, **Railway**, and **VPS Docker**, refer to:  
👉 **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)**

---

## 🏗️ Pipeline Architecture

The CI/CD pipeline consists of the following automated workflows:

1. **`main-ci-cd.yml`**: The primary orchestrator triggered on push to `main`.
   - **Stage 1: Automated Test & Lint Gate (`test-and-lint`)**: Runs `npm run check` (TypeScript static analysis) and `npm test` (Vitest automated test suite). If any test or type check fails, the pipeline halts immediately, preventing broken builds.
   - **Stage 2: Container Build & Push (`reusable-build.yml`)**: Builds the multi-stage Docker image, generates SBOMs, and pushes the production image to GitHub Container Registry (GHCR).
   - **Stage 3: Production Deployment (`reusable-deploy.yml`)**: Deploys the latest image to the production VPS via SSH with Compose V2, executes health check verification, and initiates auto-rollback if the container fails to start.
2. **`scheduled-security.yml`**: Runs every Sunday to scan the production image for newly disclosed CVE vulnerabilities using Trivy.
3. **`release.yml`**: Generates automated GitHub Releases when semantic tags (e.g., `v1.0.0`) are pushed.
4. **`dependabot.yml`**: Monitors and alerts on NPM and Docker dependency updates weekly.

---

## 🔑 Required GitHub Secrets (For VPS Deployment)

To enable automatic SSH deployment to your VPS, configure the following secrets under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `SERVER_HOST` | The IP address or domain of your VPS | `198.51.100.1` |
| `SERVER_USERNAME` | The SSH username for your VPS | `root` or `ubuntu` |
| `SERVER_SSH_KEY` | Private SSH key for authentication | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_FINGERPRINT` | Strict Host Key Verification fingerprint | Output from `ssh-keyscan -H <ip>` |
| `WEBHOOK_URL` | *(Optional)* Discord or Slack webhook URL for notifications | `https://discord.com/api/webhooks/...` |

---

## 🛡️ Production Approvals & Environments

To enforce manual reviews before deploying to production:
1. Go to **Settings > Environments** in GitHub.
2. Create an environment named `production`.
3. Check the **Required reviewers** box and select yourself or your team.

---

## 🔄 Rollback Procedure

The deployment workflow performs automated **Rollback Verification**.  
If a new deployment fails its health check (i.e. `docker compose up -d --wait` fails or container health fails):
1. The pipeline automatically reverts the `latest` tag to the previous stable image SHA.
2. Old containers are restored with minimal downtime.
3. Crash logs are dumped to the GitHub Actions console.
4. An incident notification is dispatched to your configured webhook.
