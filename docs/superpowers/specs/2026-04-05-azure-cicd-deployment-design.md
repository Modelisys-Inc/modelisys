# Azure CI/CD Deployment — Design Spec

**Date:** 2026-04-05
**Goal:** Automated CI/CD pipeline that builds, tests, and deploys Modelisys to Azure Container Apps on every push to `main`, with managed PostgreSQL, custom domains, and scale-to-zero for minimal cost.

**Prior art:** [2026-03-14 Staging Deployment Design](2026-03-14-azure-staging-deployment-design.md) — manual script-based deploy to Container Apps. This spec replaces it with automated CI/CD and adds managed database + custom domains.

## Architecture

```
GitHub (push to main)
    │
    ▼
GitHub Actions Pipeline
    ├── Test (pytest + pnpm build)
    ├── Build & push Docker images → ACR
    └── Deploy new revisions → Container Apps
              │
    ┌─────────┴──────────┐
    │                     │
 Container App:        Container App:
   modelisys-backend     modelisys-frontend
   port 8000             port 3000
   api.modelisys.com     app.modelisys.com
   min 0 / max 2         min 0 / max 2
    │
    ▼
 Azure Database for PostgreSQL
 (Flexible Server, Burstable B1ms)
```

### Azure Resources

| Resource | Name | SKU | Est. Cost/mo |
|---|---|---|---|
| Resource Group | `modelisys-rg` | — | $0 |
| Container Registry | `modelisysacr` | Basic | $5 |
| Container Apps Environment | `modelisys-env` | Consumption | ~$0-5 |
| Container App (backend) | `modelisys-backend` | 0.25 vCPU / 0.5Gi | included above |
| Container App (frontend) | `modelisys-frontend` | 0.25 vCPU / 0.5Gi | included above |
| PostgreSQL Flexible Server | `modelisys-db` | Burstable B1ms (1 vCore, 2GB, 32GB storage) | ~$12 |
| **Total** | | | **~$17-22/mo** |

### Networking

- **Backend** — external ingress on port 8000, custom domain `api.modelisys.com`, managed TLS cert
- **Frontend** — external ingress on port 3000, custom domain `app.modelisys.com`, managed TLS cert
- **PostgreSQL** — Azure managed service, firewall allows Container Apps Environment outbound IPs only
- Both Container Apps in same environment, can communicate internally if needed

### Scaling

- Frontend & Backend: min 0 / max 2 replicas (scale to zero when idle)
- Scale rule: HTTP concurrent requests (default threshold)
- PostgreSQL: always on (managed service)

## GitHub Actions Pipeline

**File:** `.github/workflows/deploy.yml`
**Trigger:** Push to `main` branch

### Stage 1 — Test

```yaml
- Checkout code
- Set up Python 3.12, install backend deps
- Run: python -m pytest (backend tests, SQLite in-memory)
- Set up Node 20, install frontend deps with pnpm
- Run: pnpm build (catches TS/build errors)
```

If either step fails, the pipeline stops. No images are built, no deploy happens.

### Stage 2 — Build & Push

```yaml
- Log in to Azure via service principal (AZURE_CREDENTIALS secret)
- Log in to ACR
- Build backend image: docker build -f backend/Dockerfile -t modelisysacr.azurecr.io/backend:$SHA
- Build frontend image: docker build -f frontend/Dockerfile.prod -t modelisysacr.azurecr.io/frontend:$SHA
- Tag both as :latest
- Push all tags to ACR
```

Images are tagged with the git commit SHA for traceability. The `:latest` tag is also pushed for convenience.

### Stage 3 — Deploy

```yaml
- Update backend Container App to new image tag
  az containerapp update --name modelisys-backend --image modelisysacr.azurecr.io/backend:$SHA
- Update frontend Container App to new image tag
  az containerapp update --name modelisys-frontend --image modelisysacr.azurecr.io/frontend:$SHA
```

Container Apps creates new revisions automatically. Old revisions remain available for rollback.

### GitHub Actions Secrets Required

| Secret | Purpose |
|---|---|
| `AZURE_CREDENTIALS` | Service principal JSON for `az login` |
| `ACR_LOGIN_SERVER` | e.g., `modelisysacr.azurecr.io` |
| `ACR_USERNAME` | ACR admin username |
| `ACR_PASSWORD` | ACR admin password |

Deployment target names (`modelisys-backend`, `modelisys-frontend`, `modelisys-rg`) are hardcoded in the workflow since they don't change.

## Infrastructure Setup

### One-time provisioning script: `infra/setup.sh`

Idempotent bash script using Azure CLI. Creates all Azure resources:

1. **Prerequisites check** — verify `az` CLI installed and logged in
2. **Resource Group** — `az group create --name modelisys-rg --location canadaeast`
3. **Container Registry** — `az acr create` (Basic SKU), enable admin access
4. **PostgreSQL Flexible Server** — `az postgres flexible-server create` (B1ms, PostgreSQL 16, 32GB storage)
   - Create database `modelisys`
   - Configure firewall rule for Container Apps outbound IPs
5. **Container Apps Environment** — `az containerapp env create`
6. **Backend Container App** — `az containerapp create` with:
   - Image: `modelisysacr.azurecr.io/backend:latest` (placeholder, pipeline overwrites)
   - Ingress: external, target port 8000
   - Env vars as secrets: `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS=https://app.modelisys.com`, `FRONTEND_URL=https://app.modelisys.com`, `ENVIRONMENT=production`
   - Optional: `SENTRY_DSN`, SMTP settings
   - Min replicas: 0, Max: 2, CPU: 0.25, Memory: 0.5Gi
7. **Frontend Container App** — `az containerapp create` with:
   - Image: `modelisysacr.azurecr.io/frontend:latest` (placeholder)
   - Ingress: external, target port 3000
   - Env vars: `NEXT_PUBLIC_API_URL=https://api.modelisys.com`, `NODE_ENV=production`
   - Min replicas: 0, Max: 2, CPU: 0.25, Memory: 0.5Gi
8. **Service Principal** — create SP with Contributor role scoped to resource group, output credentials for GitHub Actions secrets
9. **Print summary** — resource names, URLs, and instructions for DNS setup + GitHub secrets

### Teardown script: `infra/teardown.sh`

Deletes the resource group (and everything in it) plus the service principal. For cost control — run when you don't need the environment.

### DNS Configuration (manual)

In your domain registrar for `modelisys.com`:
- `app.modelisys.com` → CNAME → `modelisys-frontend.<hash>.canadaeast.azurecontainerapps.io`
- `api.modelisys.com` → CNAME → `modelisys-backend.<hash>.canadaeast.azurecontainerapps.io`

After DNS propagates, configure custom domains on each Container App:
```bash
az containerapp hostname add --name modelisys-frontend --hostname app.modelisys.com
az containerapp hostname bind --name modelisys-frontend --hostname app.modelisys.com --environment modelisys-env --validation-method CNAME
# Repeat for api.modelisys.com on modelisys-backend
```

Azure provides free managed TLS certificates automatically after domain verification.

## Frontend Production Dockerfile

**File:** `frontend/Dockerfile.prod`

Multi-stage build optimized for production:

```
Stage 1 — builder (node:20-alpine)
  - Enable corepack, activate pnpm
  - Copy package.json + pnpm-lock.yaml, install deps (frozen lockfile)
  - Copy source, run pnpm build (Next.js standalone output)

Stage 2 — runner (node:20-alpine)
  - Copy standalone build from builder
  - Copy static assets + public directory
  - Expose port 3000
  - CMD: node server.js
```

Requires `output: "standalone"` in `next.config.ts`. Final image ~150MB.

`NEXT_PUBLIC_API_URL` is set as a build arg so it's baked into the client-side JS at build time. Since it's always `https://api.modelisys.com` in production, this is hardcoded in the workflow.

## Rollback Strategy

- Container Apps keeps previous revisions by default
- To rollback: `az containerapp revision activate --name <app> --revision <previous-revision>`
- Image tags use git SHA, so any previous version can be redeployed by referencing its tag
- Database migrations are forward-only; destructive schema changes require manual care

## Monitoring & Observability

- **Container Apps Log Analytics** — console logs from both apps visible in Azure Portal (built-in, no extra cost)
- **Sentry** — existing integration continues via `SENTRY_DSN` env var for error tracking
- **Health checks** — backend `/api/health` endpoint used as Container Apps health probe
- No additional monitoring tools needed at this stage

## Security

- All secrets stored as Container Apps secrets (never in code or env files)
- GitHub Actions secrets for Azure credentials and ACR auth
- PostgreSQL firewall restricts access to Container Apps Environment outbound IPs only
- HTTPS enforced on both custom domains via managed certificates
- CORS configured to allow only `https://app.modelisys.com`

## Out of Scope

- **Playwright e2e tests in pipeline** — requires a running app; better added later as a post-deploy smoke test or separate workflow
- **Staging environment** — single production environment for now; can add staging by duplicating Container Apps with different names/domains
- **CDN** — not needed at current traffic levels
- **Blue/green or canary deployments** — revision-based rollback is sufficient for now

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `.github/workflows/deploy.yml` | Create | CI/CD pipeline |
| `infra/setup.sh` | Create | One-time Azure resource provisioning |
| `infra/teardown.sh` | Create | Resource cleanup script |
| `frontend/Dockerfile.prod` | Create | Production frontend Docker image |
| `frontend/next.config.ts` | Modify | Add `output: "standalone"` |
| `CLAUDE.md` | Modify | Add CI/CD and deployment documentation |
