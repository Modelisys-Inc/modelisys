# Azure CI/CD Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automated CI/CD pipeline deploying Modelisys to Azure Container Apps on every push to `main`, with managed PostgreSQL, custom domains (`app.modelisys.com`, `api.modelisys.com`), and scale-to-zero.

**Architecture:** GitHub Actions pipeline (test -> build -> deploy) targeting two Azure Container Apps (backend + frontend) backed by Azure Database for PostgreSQL Flexible Server. Images stored in Azure Container Registry. Infrastructure provisioned via a one-time setup script.

**Tech Stack:** GitHub Actions, Azure CLI, Azure Container Apps, Azure Container Registry (Basic), Azure Database for PostgreSQL Flexible Server (B1ms), Docker multi-stage builds, Next.js standalone output.

**Spec:** `docs/superpowers/specs/2026-04-05-azure-cicd-deployment-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/Dockerfile.prod` | Create | Multi-stage production build for Next.js (standalone output) |
| `frontend/next.config.mjs` | Modify | Add `output: "standalone"` for containerized production builds |
| `backend/Dockerfile` | Modify | Remove `--reload` flag for production use |
| `docker-compose.yml` | Modify | Add `command:` override to preserve dev hot reload |
| `.github/workflows/deploy.yml` | Create | CI/CD pipeline: test, build, push, deploy |
| `infra/setup.sh` | Create | One-time Azure resource provisioning script |
| `infra/teardown.sh` | Create | Destroy all Azure resources for cost control |
| `CLAUDE.md` | Modify | Document CI/CD and deployment setup |

---

## Task 1: Frontend Production Dockerfile

**Files:**
- Create: `frontend/Dockerfile.prod`
- Modify: `frontend/next.config.mjs`

- [ ] **Step 1: Add `output: "standalone"` to Next.js config**

Edit `frontend/next.config.mjs` to add the `output` property:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Proxy API requests to the backend — avoids CORS issues (Firefox, etc.)
  // INTERNAL_API_URL is for server-side (container-to-container via Docker network).
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.INTERNAL_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ]
  },
  // Docker + volume monté (Windows) : le file watcher natif échoue souvent ; le polling fiabilise le hot reload.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

export default nextConfig
```

The only change is adding `output: "standalone"` as the first property. This tells Next.js to produce a self-contained build that can run with `node server.js` without needing the full `node_modules`.

- [ ] **Step 2: Verify the dev build still works with standalone config**

Run from the project root:
```bash
cd frontend && pnpm build
```

Expected: Build completes successfully. A `.next/standalone` directory is created alongside the normal `.next` output. This confirms `output: "standalone"` works with the current codebase.

- [ ] **Step 3: Create `frontend/Dockerfile.prod`**

Create the file with this content:

```dockerfile
# Stage 1: Install dependencies and build
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Install dependencies first (cache layer)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build argument for API URL (baked into client JS at build time)
ARG NEXT_PUBLIC_API_URL=https://api.modelisys.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN pnpm build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 4: Test the production Dockerfile builds locally**

```bash
cd frontend && docker build -f Dockerfile.prod -t modelisys-frontend:test .
```

Expected: Build completes successfully. The final image should be around 150-200MB.

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile.prod frontend/next.config.mjs
git commit -m "feat: add frontend production Dockerfile with standalone output"
```

---

## Task 2: Backend Dockerfile Production Fix

**Files:**
- Modify: `backend/Dockerfile`
- Modify: `docker-compose.yml`

The current backend Dockerfile uses `--reload` which is for development only. We need to remove it for production, but the dev `docker-compose.yml` relies on the Dockerfile's CMD (it has no `command:` override). So we must also add a `command:` to the dev compose to preserve hot reload.

- [ ] **Step 1: Update backend Dockerfile to remove `--reload`**

Edit `backend/Dockerfile` — change only the last line (the CMD):

Old:
```dockerfile
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
```

New:
```dockerfile
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

- [ ] **Step 2: Add `command:` override to dev docker-compose.yml**

Edit `docker-compose.yml` — add a `command:` to the `backend` service to restore `--reload` for development:

```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
```

The only addition is the `command:` line after `dockerfile: Dockerfile`. This overrides the Dockerfile CMD in dev, preserving hot reload.

- [ ] **Step 3: Verify the dev docker-compose still works**

```bash
docker-compose up backend --build -d
docker-compose logs backend | tail -5
```

Expected: Backend starts with `--reload` flag visible in the logs. Hot reload works.

```bash
docker-compose down
```

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile docker-compose.yml
git commit -m "fix: remove --reload from backend Dockerfile, add command override for dev"
```

---

## Task 3: Infrastructure Setup Script

**Files:**
- Create: `infra/setup.sh`

- [ ] **Step 1: Create the `infra/` directory**

```bash
mkdir -p infra
```

- [ ] **Step 2: Create `infra/setup.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Modelisys Azure Infrastructure Setup
# One-time script to provision all Azure resources for production.
# Idempotent — safe to run multiple times.
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Sufficient Azure subscription permissions (Contributor)
#
# Usage:
#   chmod +x infra/setup.sh
#   ./infra/setup.sh
# =============================================================================

# --- Configuration -----------------------------------------------------------
RESOURCE_GROUP="modelisys-rg"
LOCATION="canadaeast"
ACR_NAME="modelisysacr"
CONTAINER_ENV="modelisys-env"
BACKEND_APP="modelisys-backend"
FRONTEND_APP="modelisys-frontend"
DB_SERVER="modelisys-db"
DB_NAME="modelisys"
DB_ADMIN_USER="modelisysadmin"
SP_NAME="modelisys-github-deploy"

# --- Helpers -----------------------------------------------------------------
info()  { echo "==> $*"; }
error() { echo "ERROR: $*" >&2; exit 1; }

# --- Prerequisites -----------------------------------------------------------
info "Checking prerequisites..."
command -v az >/dev/null 2>&1 || error "Azure CLI (az) is not installed. Install from https://aka.ms/install-azure-cli"
az account show >/dev/null 2>&1 || error "Not logged in to Azure. Run: az login"

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
info "Using subscription: $SUBSCRIPTION_ID"

# --- Resource Group ----------------------------------------------------------
info "Creating resource group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# --- Container Registry ------------------------------------------------------
info "Creating container registry: $ACR_NAME"
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

info "ACR login server: $ACR_LOGIN_SERVER"

# --- PostgreSQL Flexible Server ----------------------------------------------
info "Creating PostgreSQL Flexible Server: $DB_SERVER"
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

# Check if server already exists
if az postgres flexible-server show --name "$DB_SERVER" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  info "PostgreSQL server already exists, skipping creation"
else
  az postgres flexible-server create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DB_SERVER" \
    --location "$LOCATION" \
    --admin-user "$DB_ADMIN_USER" \
    --admin-password "$DB_PASSWORD" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --version 16 \
    --storage-size 32 \
    --public-access 0.0.0.0 \
    --output none

  info "Creating database: $DB_NAME"
  az postgres flexible-server db create \
    --resource-group "$RESOURCE_GROUP" \
    --server-name "$DB_SERVER" \
    --database-name "$DB_NAME" \
    --output none
fi

DB_FQDN=$(az postgres flexible-server show \
  --name "$DB_SERVER" \
  --resource-group "$RESOURCE_GROUP" \
  --query fullyQualifiedDomainName -o tsv)

DATABASE_URL="postgresql://${DB_ADMIN_USER}:${DB_PASSWORD}@${DB_FQDN}:5432/${DB_NAME}?sslmode=require"

# --- Container Apps Environment ----------------------------------------------
info "Creating Container Apps environment: $CONTAINER_ENV"
az containerapp env create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CONTAINER_ENV" \
  --location "$LOCATION" \
  --output none

# --- Generate JWT Secret -----------------------------------------------------
JWT_SECRET=$(openssl rand -hex 32)

# --- Backend Container App ---------------------------------------------------
info "Creating backend container app: $BACKEND_APP"
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --environment "$CONTAINER_ENV" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --secrets \
    "database-url=$DATABASE_URL" \
    "jwt-secret=$JWT_SECRET" \
  --env-vars \
    "DATABASE_URL=secretref:database-url" \
    "JWT_SECRET_KEY=secretref:jwt-secret" \
    "ENVIRONMENT=production" \
    "CORS_ORIGINS=https://app.modelisys.com" \
    "FRONTEND_URL=https://app.modelisys.com" \
  --output none

# --- Frontend Container App --------------------------------------------------
info "Creating frontend container app: $FRONTEND_APP"
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --environment "$CONTAINER_ENV" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --env-vars \
    "NEXT_PUBLIC_API_URL=https://api.modelisys.com" \
    "NODE_ENV=production" \
  --output none

# --- Service Principal for GitHub Actions ------------------------------------
info "Creating service principal: $SP_NAME"
SP_JSON=$(az ad sp create-for-rbac \
  --name "$SP_NAME" \
  --role Contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --sdk-auth 2>/dev/null || true)

if [ -z "$SP_JSON" ]; then
  info "Service principal may already exist. Resetting credentials..."
  SP_APP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv)
  SP_JSON=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role Contributor \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
    --sdk-auth)
fi

# --- Get Container App FQDNs ------------------------------------------------
BACKEND_FQDN=$(az containerapp show \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

FRONTEND_FQDN=$(az containerapp show \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

# --- Summary -----------------------------------------------------------------
echo ""
echo "============================================================================="
echo "  MODELISYS AZURE INFRASTRUCTURE — SETUP COMPLETE"
echo "============================================================================="
echo ""
echo "  Resource Group:    $RESOURCE_GROUP"
echo "  Location:          $LOCATION"
echo ""
echo "  Container Registry:"
echo "    Login Server:    $ACR_LOGIN_SERVER"
echo "    Username:        $ACR_USERNAME"
echo "    Password:        $ACR_PASSWORD"
echo ""
echo "  PostgreSQL:"
echo "    Server:          $DB_FQDN"
echo "    Database:        $DB_NAME"
echo "    Admin User:      $DB_ADMIN_USER"
echo "    Admin Password:  $DB_PASSWORD"
echo "    Connection URL:  $DATABASE_URL"
echo ""
echo "  Container Apps:"
echo "    Backend FQDN:    $BACKEND_FQDN"
echo "    Frontend FQDN:   $FRONTEND_FQDN"
echo ""
echo "  JWT Secret:        $JWT_SECRET"
echo ""
echo "============================================================================="
echo "  NEXT STEPS"
echo "============================================================================="
echo ""
echo "  1. DNS: Add CNAME records in your domain registrar:"
echo "     app.modelisys.com  ->  $FRONTEND_FQDN"
echo "     api.modelisys.com  ->  $BACKEND_FQDN"
echo ""
echo "  2. Custom domains (run after DNS propagates):"
echo "     az containerapp hostname add --resource-group $RESOURCE_GROUP --name $FRONTEND_APP --hostname app.modelisys.com"
echo "     az containerapp hostname bind --resource-group $RESOURCE_GROUP --name $FRONTEND_APP --hostname app.modelisys.com --environment $CONTAINER_ENV --validation-method CNAME"
echo "     az containerapp hostname add --resource-group $RESOURCE_GROUP --name $BACKEND_APP --hostname api.modelisys.com"
echo "     az containerapp hostname bind --resource-group $RESOURCE_GROUP --name $BACKEND_APP --hostname api.modelisys.com --environment $CONTAINER_ENV --validation-method CNAME"
echo ""
echo "  3. GitHub Secrets: Add these to your repo (Settings > Secrets > Actions):"
echo "     AZURE_CREDENTIALS   = (JSON below)"
echo "     ACR_LOGIN_SERVER    = $ACR_LOGIN_SERVER"
echo "     ACR_USERNAME        = $ACR_USERNAME"
echo "     ACR_PASSWORD        = $ACR_PASSWORD"
echo ""
echo "  AZURE_CREDENTIALS JSON:"
echo "  $SP_JSON"
echo ""
echo "  4. Push to main to trigger the first deployment!"
echo ""
echo "  IMPORTANT: Save the PostgreSQL password and JWT secret securely."
echo "  They are stored as Container Apps secrets but are not retrievable later."
echo "============================================================================="
```

- [ ] **Step 3: Make the script executable**

```bash
chmod +x infra/setup.sh
```

- [ ] **Step 4: Commit**

```bash
git add infra/setup.sh
git commit -m "feat: add Azure infrastructure provisioning script"
```

---

## Task 4: Infrastructure Teardown Script

**Files:**
- Create: `infra/teardown.sh`

- [ ] **Step 1: Create `infra/teardown.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Modelisys Azure Infrastructure Teardown
# Destroys all Azure resources. USE WITH CAUTION — this deletes the database.
#
# Usage:
#   chmod +x infra/teardown.sh
#   ./infra/teardown.sh
# =============================================================================

RESOURCE_GROUP="modelisys-rg"
SP_NAME="modelisys-github-deploy"

info()  { echo "==> $*"; }
error() { echo "ERROR: $*" >&2; exit 1; }

echo "============================================================================="
echo "  WARNING: This will PERMANENTLY DELETE all Modelisys Azure resources"
echo "  including the database and all data."
echo "============================================================================="
echo ""
read -p "Type 'DELETE' to confirm: " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
  echo "Aborted."
  exit 0
fi

# --- Delete Resource Group (deletes everything inside) -----------------------
info "Deleting resource group: $RESOURCE_GROUP (this may take a few minutes)..."
az group delete \
  --name "$RESOURCE_GROUP" \
  --yes \
  --no-wait \
  --output none 2>/dev/null || info "Resource group not found or already deleted"

# --- Delete Service Principal ------------------------------------------------
info "Deleting service principal: $SP_NAME"
SP_APP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv 2>/dev/null)
if [ -n "$SP_APP_ID" ]; then
  az ad sp delete --id "$SP_APP_ID" --output none
  info "Service principal deleted"
else
  info "Service principal not found or already deleted"
fi

echo ""
echo "Teardown initiated. Resource group deletion runs in the background."
echo "Check status: az group show --name $RESOURCE_GROUP 2>/dev/null || echo 'Deleted'"
```

- [ ] **Step 2: Make the script executable**

```bash
chmod +x infra/teardown.sh
```

- [ ] **Step 3: Commit**

```bash
git add infra/teardown.sh
git commit -m "feat: add Azure infrastructure teardown script"
```

---

## Task 5: GitHub Actions Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

env:
  ACR_LOGIN_SERVER: ${{ secrets.ACR_LOGIN_SERVER }}
  BACKEND_IMAGE: ${{ secrets.ACR_LOGIN_SERVER }}/backend
  FRONTEND_IMAGE: ${{ secrets.ACR_LOGIN_SERVER }}/frontend
  RESOURCE_GROUP: modelisys-rg
  BACKEND_APP: modelisys-backend
  FRONTEND_APP: modelisys-frontend

jobs:
  # -----------------------------------------------------------------------
  # Stage 1: Test
  # -----------------------------------------------------------------------
  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r backend/requirements.txt

      - name: Run tests
        working-directory: backend
        run: python -m pytest -v

  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Enable pnpm
        run: corepack enable

      - name: Install dependencies
        working-directory: frontend
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: frontend
        run: pnpm build

  # -----------------------------------------------------------------------
  # Stage 2: Build & Push Docker Images
  # -----------------------------------------------------------------------
  build-and-push:
    name: Build & Push Images
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Log in to ACR
        run: |
          echo "${{ secrets.ACR_PASSWORD }}" | docker login \
            "${{ env.ACR_LOGIN_SERVER }}" \
            -u "${{ secrets.ACR_USERNAME }}" \
            --password-stdin

      - name: Build and push backend image
        run: |
          docker build \
            -f backend/Dockerfile \
            -t "${{ env.BACKEND_IMAGE }}:${{ github.sha }}" \
            -t "${{ env.BACKEND_IMAGE }}:latest" \
            backend/
          docker push "${{ env.BACKEND_IMAGE }}:${{ github.sha }}"
          docker push "${{ env.BACKEND_IMAGE }}:latest"

      - name: Build and push frontend image
        run: |
          docker build \
            -f frontend/Dockerfile.prod \
            --build-arg NEXT_PUBLIC_API_URL=https://api.modelisys.com \
            -t "${{ env.FRONTEND_IMAGE }}:${{ github.sha }}" \
            -t "${{ env.FRONTEND_IMAGE }}:latest" \
            frontend/
          docker push "${{ env.FRONTEND_IMAGE }}:${{ github.sha }}"
          docker push "${{ env.FRONTEND_IMAGE }}:latest"

  # -----------------------------------------------------------------------
  # Stage 3: Deploy to Azure Container Apps
  # -----------------------------------------------------------------------
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: [build-and-push]
    steps:
      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy backend
        run: |
          az containerapp update \
            --name "${{ env.BACKEND_APP }}" \
            --resource-group "${{ env.RESOURCE_GROUP }}" \
            --image "${{ env.BACKEND_IMAGE }}:${{ github.sha }}"

      - name: Deploy frontend
        run: |
          az containerapp update \
            --name "${{ env.FRONTEND_APP }}" \
            --resource-group "${{ env.RESOURCE_GROUP }}" \
            --image "${{ env.FRONTEND_IMAGE }}:${{ github.sha }}"

      - name: Verify deployments
        run: |
          echo "Backend:"
          az containerapp show \
            --name "${{ env.BACKEND_APP }}" \
            --resource-group "${{ env.RESOURCE_GROUP }}" \
            --query "{status:properties.runningStatus, fqdn:properties.configuration.ingress.fqdn, latestRevision:properties.latestRevisionName}" \
            -o table
          echo ""
          echo "Frontend:"
          az containerapp show \
            --name "${{ env.FRONTEND_APP }}" \
            --resource-group "${{ env.RESOURCE_GROUP }}" \
            --query "{status:properties.runningStatus, fqdn:properties.configuration.ingress.fqdn, latestRevision:properties.latestRevisionName}" \
            -o table
```

- [ ] **Step 3: Validate the workflow YAML syntax**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

If Python yaml isn't available, install it: `pip install pyyaml` and retry.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions CI/CD pipeline for Azure deployment"
```

---

## Task 6: Update CLAUDE.md with CI/CD Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add CI/CD section to CLAUDE.md**

Append the following section before the `## Git Workflow` section in `CLAUDE.md`:

```markdown
## CI/CD & Deployment

### Pipeline
- **GitHub Actions** deploys automatically on every push to `main`
- Pipeline: test (pytest + pnpm build) -> build Docker images -> push to ACR -> deploy to Azure Container Apps
- Workflow file: `.github/workflows/deploy.yml`

### Azure Resources
- **Container Apps:** `modelisys-backend` (port 8000) + `modelisys-frontend` (port 3000) in `modelisys-env`
- **Container Registry:** `modelisysacr` (Basic SKU)
- **PostgreSQL:** `modelisys-db` (Flexible Server, Burstable B1ms, PostgreSQL 16)
- **Resource Group:** `modelisys-rg` (Canada East)
- **Domains:** `app.modelisys.com` (frontend), `api.modelisys.com` (backend)

### Infrastructure Scripts
```bash
# First-time setup (requires az login)
./infra/setup.sh

# Destroy all resources
./infra/teardown.sh
```

### Rollback
```bash
# List revisions
az containerapp revision list --name modelisys-backend --resource-group modelisys-rg -o table

# Activate a previous revision
az containerapp revision activate --name modelisys-backend --resource-group modelisys-rg --revision <revision-name>
```
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CI/CD and Azure deployment documentation to CLAUDE.md"
```

---

## Task 7: End-to-End Validation

This task validates the full pipeline locally before pushing. No Azure resources are needed — we're verifying the files are correct and the Docker builds work.

- [ ] **Step 1: Verify all new files exist**

```bash
ls -la .github/workflows/deploy.yml
ls -la frontend/Dockerfile.prod
ls -la infra/setup.sh
ls -la infra/teardown.sh
```

Expected: All four files exist.

- [ ] **Step 2: Verify frontend production Docker build**

```bash
cd frontend && docker build -f Dockerfile.prod -t modelisys-frontend:test . && cd ..
```

Expected: Build completes successfully in two stages (builder + runner).

- [ ] **Step 3: Verify backend Docker build**

```bash
cd backend && docker build -t modelisys-backend:test . && cd ..
```

Expected: Build completes. The CMD should NOT contain `--reload`.

- [ ] **Step 4: Verify backend tests pass**

```bash
cd backend && python -m pytest -v && cd ..
```

Expected: All tests pass.

- [ ] **Step 5: Verify frontend build passes**

```bash
cd frontend && pnpm build && cd ..
```

Expected: Build completes with standalone output in `.next/standalone/`.

- [ ] **Step 6: Verify workflow YAML is valid**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 7: Final commit — all files together**

If any files were missed in individual task commits:

```bash
git status
# Stage any remaining files
git add -A
git status
# If there are changes:
git commit -m "chore: ensure all CI/CD files are committed"
```

- [ ] **Step 8: Verify git log shows all commits**

```bash
git log --oneline -10
```

Expected: You should see commits for:
1. Frontend production Dockerfile + standalone config
2. Backend Dockerfile production fix
3. Infrastructure setup script
4. Infrastructure teardown script
5. GitHub Actions workflow
6. CLAUDE.md documentation update
