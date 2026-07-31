# CI/CD Deployment Documentation

This repository uses a fully automated, Enterprise-Grade DevSecOps pipeline using GitHub Actions, tailored for a secure Docker Compose deployment on a single VPS.

## Architecture

The CI/CD pipeline consists of the following workflows:
1. **`main-ci-cd.yml`**: The primary orchestrator. Runs on `push` to `main`.
2. **`reusable-build.yml`**: Called by the main orchestrator to Build, generate SBOMs, cache, and push Docker images to GitHub Container Registry (GHCR).
3. **`reusable-deploy.yml`**: Called by the main orchestrator to deploy the image via SSH. Features auto-rollback on failure and minimal-downtime waits using Compose V2.
4. **`scheduled-security.yml`**: Runs every Sunday to scan the latest production image for new vulnerabilities using Trivy.
5. **`release.yml`**: Automatically generates GitHub Releases when semantic tags (e.g., `v1.0.0`) are pushed.
6. **`dependabot.yml`**: Automatically checks for NPM and Docker dependency updates weekly.

## Required GitHub Secrets

To make the deployment work, you MUST configure the following secrets in your GitHub Repository under **Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SERVER_HOST` | The IP address or domain of your VPS. | `198.51.100.1` |
| `SERVER_USERNAME` | The SSH username for your VPS. | `root` or `ubuntu` |
| `SERVER_SSH_KEY` | Your private SSH key for authentication. | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_FINGERPRINT`| Strict Host Key Verification fingerprint. | Run `ssh-keyscan -H <ip>` on your laptop to get this. |
| `WEBHOOK_URL` | (Optional) Discord or Slack webhook URL for notifications. | `https://discord.com/api/webhooks/...` |

## GitHub Environments (Production Approvals)

To enforce manual approvals before deploying to production:
1. Go to **Settings > Environments** in GitHub.
2. Click **New Environment** and name it `production`.
3. Check the **Required reviewers** box and add yourself (or your team).
4. (Optional) You can scope the deployment secrets specifically to this environment for extra security.

## Rollback Procedure

The deployment script automatically performs **Rollback Verification**. 
If a new deployment fails its health check (i.e., `docker compose up -d --wait` fails), the CI pipeline will:
1. Immediately revert the `latest` tag back to the previously running image SHA.
2. Restart the old containers.
3. Print the crash logs to the GitHub Actions console for debugging.
4. Send a failure notification to your Webhook.
