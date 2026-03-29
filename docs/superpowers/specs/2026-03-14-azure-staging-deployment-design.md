# Azure Staging Deployment — Design Spec

**Date:** 2026-03-14
**Goal:** Deploy Modelisys (frontend, backend, database) to Azure Container Apps as a staging/demo environment via a single bash script.

## Architecture

```
Resource Group: rg-modelisys-staging
├── Azure Container Registry (ACR)     — stores Docker images (Basic SKU)
├── Azure Storage Account              — file share for PostgreSQL data
├── Container Apps Environment         — shared networking/logging
├── Container App: modelisys-db        — PostgreSQL 16 (internal only, min 1 replica)
├── Container App: modelisys-backend   — FastAPI (external ingress, target port 8001, min 0 / max 1)
└── Container App: modelisys-frontend  — Next.js (external ingress, target port 3000, min 0 / max 1)
```

### Networking

- **PostgreSQL** — internal only (no external ingress), reachable by backend via internal FQDN (`modelisys-db.internal.<env-default-domain>`)
- **Backend** — external ingress, target port 8001, exposed at `https://modelisys-backend.<hash>.canadaeast.azurecontainerapps.io` (port 443)
- **Frontend** — external ingress, target port 3000, exposed at `https://modelisys-frontend.<hash>.canadaeast.azurecontainerapps.io` (port 443)

Note: Azure Container Apps always expose external ingress on HTTPS port 443. The `--target-port` maps to the container's internal port.

### Scaling

- Frontend & Backend: min 0 / max 1 replicas (scale to zero when idle)
- PostgreSQL: min 1 / max 1 (always on to preserve data)

## Deliverables

### 1. `deploy-azure.sh`

Single idempotent bash script. Flow:

1. **Configuration** — all resource names, region, SKU defined as variables at the top
2. **Prerequisites check** — verify `az` CLI installed and logged in
3. **Resource Group** — `az group create` (idempotent)
4. **Container Registry** — `az acr create` (Basic SKU), enable admin access for Container Apps to pull images
5. **Storage Account** — create Azure Storage Account + file share for PostgreSQL data persistence
6. **Build Backend Image** — `az acr build` builds `backend/Dockerfile.prod` in the cloud (no local Docker needed)
7. **Container Apps Environment** — `az containerapp env create`, mount Azure Files storage
8. **Deploy PostgreSQL** — container app using `postgres:16-alpine`, internal only, Azure Files volume mounted at `/var/lib/postgresql/data`, TCP health probe on port 5432
9. **Deploy Backend** — container app with env vars: `DATABASE_URL` (using DB internal FQDN), `JWT_SECRET_KEY`, `ENVIRONMENT=staging`, `CORS_ORIGINS` (initially `*` for staging, updated to frontend URL after frontend deploys), `FRONTEND_URL`. Startup command includes wait-for-db retry loop before running `alembic upgrade head`.
10. **Capture Backend URL** — `az containerapp show --query properties.configuration.ingress.fqdn -o tsv`, construct `NEXT_PUBLIC_API_URL=https://$BACKEND_FQDN`
11. **Build Frontend Image** — `az acr build` with `--build-arg NEXT_PUBLIC_API_URL=https://$BACKEND_FQDN` (must happen AFTER backend URL is known)
12. **Deploy Frontend** — container app with `NEXT_PUBLIC_API_URL` baked in at build time
13. **Update Backend CORS** — update backend container with `CORS_ORIGINS=https://$FRONTEND_FQDN,http://localhost:3000` and `FRONTEND_URL=https://$FRONTEND_FQDN`
14. **Print URLs** — output frontend and backend public HTTPS URLs

Re-running the script updates existing resources (idempotent).

### 2. `teardown-azure.sh`

Destroys everything:
```bash
az group delete --name rg-modelisys-staging --yes --no-wait
```

### 3. `backend/Dockerfile.prod`

Production variant of the backend Dockerfile:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev postgresql-client && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["sh", "-c", "echo 'Waiting for database...' && until pg_isready -h $DB_HOST -p 5432 -U $POSTGRES_USER; do sleep 2; done && echo 'Database ready.' && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8001"]
```

Differences from dev Dockerfile:
- No `--reload` flag
- Installs `postgresql-client` for `pg_isready`
- Wait-for-db retry loop before running migrations

### 4. `frontend/Dockerfile.prod`

Multi-stage production build for Next.js 16 (requires Node.js 22+):

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Requires Next.js `output: "standalone"` in `next.config.mjs`.

### 5. `next.config.mjs` change

Add `output: "standalone"` to the existing config:

```js
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}
```

### 6. `.env.azure` (auto-generated, gitignored)

Stores auto-generated secrets on first run:
```
POSTGRES_PASSWORD=<random>
JWT_SECRET_KEY=<random>
```

Subsequent runs reuse these values.

### 7. `.gitignore` update

Add `.env.azure` to the project's `.gitignore`.

## Configuration Defaults

| Variable | Default |
|----------|---------|
| `RESOURCE_GROUP` | `rg-modelisys-staging` |
| `LOCATION` | `canadaeast` |
| `ACR_NAME` | `modelisysacr` |
| `ENV_NAME` | `modelisys-staging` |
| `STORAGE_ACCOUNT` | `modelisysstaging` |
| `POSTGRES_USER` | `modelisys` |
| `POSTGRES_DB` | `modelisys` |

## Backend Environment Variables (Container App)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$DB_INTERNAL_FQDN:5432/$POSTGRES_DB` |
| `DB_HOST` | `$DB_INTERNAL_FQDN` (for pg_isready in startup) |
| `POSTGRES_USER` | `modelisys` |
| `JWT_SECRET_KEY` | auto-generated |
| `ENVIRONMENT` | `staging` |
| `CORS_ORIGINS` | `https://$FRONTEND_FQDN,http://localhost:3000` |
| `FRONTEND_URL` | `https://$FRONTEND_FQDN` |

Internal FQDN format: `modelisys-db.internal.<env-default-domain>`

## ACR Authentication

Container Apps pull images from ACR using admin credentials:
- Enable ACR admin: `az acr update --name $ACR_NAME --admin-enabled true`
- Pass `--registry-server`, `--registry-username`, `--registry-password` to `az containerapp create`

## PostgreSQL Data Persistence

Azure Files volume mounted to the PostgreSQL container:
1. Create Storage Account: `az storage account create`
2. Create File Share: `az storage share create --name postgres-data`
3. Add storage to Container Apps Environment: `az containerapp env storage set`
4. Mount volume on PostgreSQL container: `--mount /var/lib/postgresql/data`

**Known limitation:** Azure Files (SMB) does not fully support `fsync`/POSIX file locking that PostgreSQL expects. For a staging/demo environment this is acceptable — worst case, data can be re-seeded. For production, use Azure Database for PostgreSQL Flexible Server instead.

## Prerequisites

1. Azure account with an active subscription
2. Azure CLI (`az`) installed and logged in (`az login`)
3. No local Docker required — images build in the cloud via `az acr build`

## Estimated Cost

| Resource | Monthly Cost |
|----------|-------------|
| Container Registry (Basic) | ~$5 |
| PostgreSQL Container App (always-on, 0.25 vCPU / 0.5 GiB) | ~$15 |
| Frontend + Backend (scale-to-zero, minimal traffic) | ~$0-5 |
| Storage Account (small file share) | ~$1 |
| **Total** | **~$20-25/month** |

Frontend and backend scale to zero when idle. The DB container stays at min 1 replica (~$15/month).

## Deploy Order Constraints

1. Resource Group must exist first
2. ACR must exist before building any images
3. Storage Account must exist before Container Apps Environment (to mount storage)
4. Container Apps Environment must exist before deploying any app
5. PostgreSQL must deploy before backend (backend waits for DB readiness on startup)
6. Backend must deploy before frontend **image build** (frontend bakes `NEXT_PUBLIC_API_URL` at build time)
7. Frontend URL must be known before backend CORS can be finalized (solved by post-deploy update)

## Security Notes

- Secrets (DB password, JWT key) are auto-generated and stored locally in `.env.azure` (gitignored)
- PostgreSQL is internal-only (no public access)
- Backend `CORS_ORIGINS` is explicitly set to the frontend's Azure URL
- Backend `ENVIRONMENT` is set to `staging` (enforces JWT validation)
- All external URLs are HTTPS (Azure Container Apps enforces TLS)
- For production: switch to Azure Database for PostgreSQL Flexible Server, add custom domain + SSL, use Azure Key Vault for secrets
