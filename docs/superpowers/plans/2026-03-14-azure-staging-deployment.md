# Azure Staging Deployment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Modelisys (frontend, backend, database) to Azure Container Apps as a staging/demo environment via a single idempotent bash script.

**Architecture:** Three Container Apps (PostgreSQL, FastAPI backend, Next.js frontend) inside a shared Container Apps Environment, with images stored in Azure Container Registry. PostgreSQL is internal-only, backend and frontend are externally accessible via HTTPS.

**Tech Stack:** Azure CLI, Azure Container Apps, Azure Container Registry, Azure Storage (Files), bash

**Spec:** `docs/superpowers/specs/2026-03-14-azure-staging-deployment-design.md`

---

## Chunk 1: Project Configuration Changes

### Task 1: Add `output: "standalone"` to Next.js config

**Files:**
- Modify: `frontend/next.config.mjs`

- [ ] **Step 1: Update next.config.mjs**

Add `output: "standalone"` to the existing config:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

- [ ] **Step 2: Verify the config is valid**

Run: `cd frontend && node -e "import('./next.config.mjs').then(m => console.log(JSON.stringify(m.default, null, 2)))"`
Expected: JSON output showing `"output": "standalone"`

- [ ] **Step 3: Commit**

```bash
git add frontend/next.config.mjs
git commit -m "feat: add standalone output to Next.js config for Azure deployment"
```

### Task 2: Add `.env.azure` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Append `.env.azure` to `.gitignore`**

Add this line after the existing `.env.*.local` line:

```
.env.azure
```

- [ ] **Step 2: Verify**

Run: `grep '.env.azure' .gitignore`
Expected: `.env.azure`

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .env.azure to gitignore"
```

### Task 3: Create `backend/Dockerfile.prod`

**Files:**
- Create: `backend/Dockerfile.prod`

- [ ] **Step 1: Write the production Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (including postgresql-client for pg_isready)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8001

# Wait for DB, run migrations, then start server (no --reload)
CMD ["sh", "-c", "echo 'Waiting for database...' && until pg_isready -h $DB_HOST -p 5432 -U $POSTGRES_USER; do sleep 2; done && echo 'Database ready.' && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8001"]
```

- [ ] **Step 2: Verify Dockerfile syntax**

Run: `head -20 backend/Dockerfile.prod`
Expected: Shows the Dockerfile contents starting with `FROM python:3.12-slim`

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile.prod
git commit -m "feat: add production Dockerfile for backend (no reload, wait-for-db)"
```

### Task 4: Create `frontend/Dockerfile.prod`

**Files:**
- Create: `frontend/Dockerfile.prod`

- [ ] **Step 1: Write the production multi-stage Dockerfile**

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Accept API URL as build argument (Next.js bakes NEXT_PUBLIC_* at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN pnpm build

# --- Production runner ---
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: Verify Dockerfile syntax**

Run: `head -20 frontend/Dockerfile.prod`
Expected: Shows the Dockerfile contents starting with `FROM node:22-alpine AS builder`

- [ ] **Step 3: Commit**

```bash
git add frontend/Dockerfile.prod
git commit -m "feat: add production Dockerfile for frontend (multi-stage, standalone)"
```

---

## Chunk 2: Deploy Script

### Task 5: Create `deploy-azure.sh`

**Files:**
- Create: `deploy-azure.sh`

This is the main deployment script. It is idempotent — safe to re-run.

- [ ] **Step 1: Write the deploy script**

```bash
#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Modelisys — Azure Staging Deployment Script
#
# Deploys frontend, backend, and PostgreSQL to Azure Container Apps.
# Idempotent: safe to re-run. Updates existing resources if they exist.
#
# Prerequisites:
#   - Azure CLI (az) installed: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
#   - Logged in: az login
#
# Usage:
#   ./deploy-azure.sh
###############################################################################

# ── Configuration ────────────────────────────────────────────────────────────

RESOURCE_GROUP="rg-modelisys-staging"
LOCATION="canadaeast"
ACR_NAME="modelisysacr"
ENV_NAME="modelisys-staging"
STORAGE_ACCOUNT="modelisysstaging"
STORAGE_SHARE="postgres-data"

POSTGRES_USER="modelisys"
POSTGRES_DB="modelisys"

BACKEND_APP="modelisys-backend"
FRONTEND_APP="modelisys-frontend"
DB_APP="modelisys-db"

BACKEND_IMAGE="${ACR_NAME}.azurecr.io/modelisys-backend:latest"
FRONTEND_IMAGE="${ACR_NAME}.azurecr.io/modelisys-frontend:latest"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.azure"

# ── Helper functions ─────────────────────────────────────────────────────────

info()  { echo "▸ $*"; }
ok()    { echo "✓ $*"; }
err()   { echo "✗ $*" >&2; exit 1; }

generate_password() {
    openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

# ── Prerequisites check ─────────────────────────────────────────────────────

command -v az >/dev/null 2>&1 || err "Azure CLI (az) is not installed. Install it: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli"

# Check if logged in
if ! az account show >/dev/null 2>&1; then
    err "Not logged in to Azure. Run: az login"
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
info "Using Azure subscription: $SUBSCRIPTION"

# ── Secrets (.env.azure) ────────────────────────────────────────────────────

if [ -f "$ENV_FILE" ]; then
    info "Loading existing secrets from .env.azure"
    # shellcheck source=/dev/null
    source "$ENV_FILE"
else
    info "Generating new secrets in .env.azure"
    POSTGRES_PASSWORD=$(generate_password)
    JWT_SECRET_KEY=$(generate_password)
    cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
EOF
    chmod 600 "$ENV_FILE"
    ok "Secrets saved to .env.azure (chmod 600)"
fi

# ── 1. Resource Group ───────────────────────────────────────────────────────

info "Creating resource group: $RESOURCE_GROUP"
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none
ok "Resource group ready"

# ── 2. Container Registry ──────────────────────────────────────────────────

info "Creating container registry: $ACR_NAME"
az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    --output none 2>/dev/null || true

# Ensure admin access is enabled (idempotent — covers re-runs where ACR already exists)
az acr update \
    --name "$ACR_NAME" \
    --admin-enabled true \
    --output none
ok "Container registry ready"

# Get ACR credentials
ACR_SERVER="${ACR_NAME}.azurecr.io"
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# ── 3. Storage Account (for PostgreSQL data) ───────────────────────────────

info "Creating storage account: $STORAGE_ACCOUNT"
az storage account create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$STORAGE_ACCOUNT" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --output none 2>/dev/null || true

STORAGE_KEY=$(az storage account keys list \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$STORAGE_ACCOUNT" \
    --query "[0].value" -o tsv)

info "Creating file share: $STORAGE_SHARE"
az storage share create \
    --name "$STORAGE_SHARE" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --output none 2>/dev/null || true
ok "Storage ready"

# ── 4. Build Backend Image ─────────────────────────────────────────────────

info "Building backend image in ACR (this may take a few minutes)..."
az acr build \
    --registry "$ACR_NAME" \
    --image modelisys-backend:latest \
    --file backend/Dockerfile.prod \
    backend/
ok "Backend image built and pushed"

# ── 5. Container Apps Environment ──────────────────────────────────────────

info "Creating Container Apps environment: $ENV_NAME"
az containerapp env create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ENV_NAME" \
    --location "$LOCATION" \
    --output none 2>/dev/null || true

# Mount storage to environment
info "Mounting storage to environment"
az containerapp env storage set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ENV_NAME" \
    --storage-name postgresstorage \
    --azure-file-account-name "$STORAGE_ACCOUNT" \
    --azure-file-account-key "$STORAGE_KEY" \
    --azure-file-share-name "$STORAGE_SHARE" \
    --access-mode ReadWrite \
    --output none 2>/dev/null || true
ok "Container Apps environment ready"

# Get environment default domain
ENV_DOMAIN=$(az containerapp env show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ENV_NAME" \
    --query "properties.defaultDomain" -o tsv)

# ── 6. Deploy PostgreSQL ──────────────────────────────────────────────────

DB_INTERNAL_FQDN="${DB_APP}.internal.${ENV_DOMAIN}"

info "Deploying PostgreSQL container: $DB_APP"

# Write YAML config for PostgreSQL (needed for volume mounts and health probes)
cat > /tmp/modelisys-db.yaml <<YAML
properties:
  template:
    containers:
      - name: postgres
        image: postgres:16-alpine
        resources:
          cpu: 0.25
          memory: 0.5Gi
        env:
          - name: POSTGRES_USER
            value: "${POSTGRES_USER}"
          - name: POSTGRES_PASSWORD
            value: "${POSTGRES_PASSWORD}"
          - name: POSTGRES_DB
            value: "${POSTGRES_DB}"
          - name: PGDATA
            value: /var/lib/postgresql/data/pgdata
        volumeMounts:
          - volumeName: postgresdata
            mountPath: /var/lib/postgresql/data
        probes:
          - type: liveness
            tcpSocket:
              port: 5432
            initialDelaySeconds: 15
            periodSeconds: 10
          - type: readiness
            tcpSocket:
              port: 5432
            initialDelaySeconds: 5
            periodSeconds: 5
    volumes:
      - name: postgresdata
        storageName: postgresstorage
        storageType: AzureFile
    scale:
      minReplicas: 1
      maxReplicas: 1
  configuration:
    ingress:
      external: false
      targetPort: 5432
      transport: tcp
YAML

az containerapp create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DB_APP" \
    --environment "$ENV_NAME" \
    --yaml /tmp/modelisys-db.yaml \
    --output none 2>/dev/null || \
az containerapp update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DB_APP" \
    --yaml /tmp/modelisys-db.yaml \
    --output none

rm -f /tmp/modelisys-db.yaml

# Note: Azure Files (SMB) has known POSIX limitations with PostgreSQL.
# For staging this is acceptable — data can be re-seeded if needed.
ok "PostgreSQL deployed (internal: $DB_INTERNAL_FQDN)"

# ── 7. Deploy Backend ─────────────────────────────────────────────────────

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_INTERNAL_FQDN}:5432/${POSTGRES_DB}"

info "Deploying backend: $BACKEND_APP"
az containerapp create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP" \
    --environment "$ENV_NAME" \
    --image "$BACKEND_IMAGE" \
    --registry-server "$ACR_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --target-port 8001 \
    --ingress external \
    --min-replicas 0 \
    --max-replicas 1 \
    --cpu 0.25 \
    --memory 0.5Gi \
    --env-vars \
        "DATABASE_URL=${DATABASE_URL}" \
        "DB_HOST=${DB_INTERNAL_FQDN}" \
        "POSTGRES_USER=${POSTGRES_USER}" \
        "JWT_SECRET_KEY=${JWT_SECRET_KEY}" \
        "ENVIRONMENT=staging" \
        "CORS_ORIGINS=*" \
        "FRONTEND_URL=https://placeholder.azurecontainerapps.io" \
    --output none 2>/dev/null || \
az containerapp update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP" \
    --image "$BACKEND_IMAGE" \
    --set-env-vars \
        "DATABASE_URL=${DATABASE_URL}" \
        "DB_HOST=${DB_INTERNAL_FQDN}" \
        "POSTGRES_USER=${POSTGRES_USER}" \
        "JWT_SECRET_KEY=${JWT_SECRET_KEY}" \
        "ENVIRONMENT=staging" \
        "CORS_ORIGINS=*" \
        "FRONTEND_URL=https://placeholder.azurecontainerapps.io" \
    --output none

# ── 8. Capture Backend URL ────────────────────────────────────────────────

BACKEND_FQDN=$(az containerapp show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP" \
    --query "properties.configuration.ingress.fqdn" -o tsv)
BACKEND_URL="https://${BACKEND_FQDN}"
ok "Backend deployed: $BACKEND_URL"

# ── 9. Build Frontend Image (needs backend URL) ──────────────────────────

info "Building frontend image in ACR with NEXT_PUBLIC_API_URL=${BACKEND_URL}..."
az acr build \
    --registry "$ACR_NAME" \
    --image modelisys-frontend:latest \
    --file frontend/Dockerfile.prod \
    --build-arg "NEXT_PUBLIC_API_URL=${BACKEND_URL}" \
    frontend/
ok "Frontend image built and pushed"

# ── 10. Deploy Frontend ──────────────────────────────────────────────────

info "Deploying frontend: $FRONTEND_APP"
az containerapp create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP" \
    --environment "$ENV_NAME" \
    --image "${ACR_NAME}.azurecr.io/modelisys-frontend:latest" \
    --registry-server "$ACR_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --target-port 3000 \
    --ingress external \
    --min-replicas 0 \
    --max-replicas 1 \
    --cpu 0.25 \
    --memory 0.5Gi \
    --output none 2>/dev/null || \
az containerapp update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP" \
    --image "${ACR_NAME}.azurecr.io/modelisys-frontend:latest" \
    --output none

FRONTEND_FQDN=$(az containerapp show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP" \
    --query "properties.configuration.ingress.fqdn" -o tsv)
FRONTEND_URL="https://${FRONTEND_FQDN}"
ok "Frontend deployed: $FRONTEND_URL"

# ── 11. Update Backend CORS with actual Frontend URL ─────────────────────

info "Updating backend CORS with frontend URL"
az containerapp update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP" \
    --set-env-vars \
        "CORS_ORIGINS=${FRONTEND_URL},http://localhost:3000" \
        "FRONTEND_URL=${FRONTEND_URL}" \
    --output none
ok "Backend CORS updated"

# ── Done ─────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Modelisys Staging Deployment Complete!"
echo ""
echo "  Frontend:  $FRONTEND_URL"
echo "  Backend:   $BACKEND_URL"
echo "  Database:  $DB_INTERNAL_FQDN (internal only)"
echo ""
echo "  Teardown:  ./teardown-azure.sh"
echo "════════════════════════════════════════════════════════════════"
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x deploy-azure.sh`

- [ ] **Step 3: Verify the script is syntactically valid**

Run: `bash -n deploy-azure.sh`
Expected: No output (means no syntax errors)

- [ ] **Step 4: Commit**

```bash
git add deploy-azure.sh
git commit -m "feat: add Azure staging deployment script"
```

### Task 6: Create `teardown-azure.sh`

**Files:**
- Create: `teardown-azure.sh`

- [ ] **Step 1: Write the teardown script**

```bash
#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Modelisys — Azure Staging Teardown Script
#
# Destroys all Azure resources created by deploy-azure.sh.
# This is irreversible — all data will be lost.
#
# Usage:
#   ./teardown-azure.sh
###############################################################################

RESOURCE_GROUP="rg-modelisys-staging"

echo "⚠  This will permanently delete ALL resources in: $RESOURCE_GROUP"
echo "   Including: Container Apps, Container Registry, Storage, and all data."
echo ""
read -r -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo "▸ Deleting resource group: $RESOURCE_GROUP"
az group delete \
    --name "$RESOURCE_GROUP" \
    --yes \
    --no-wait

echo "✓ Deletion initiated (runs in background, may take a few minutes)."
echo "  Check status: az group show --name $RESOURCE_GROUP 2>/dev/null || echo 'Deleted'"
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x teardown-azure.sh`

- [ ] **Step 3: Verify the script is syntactically valid**

Run: `bash -n teardown-azure.sh`
Expected: No output (means no syntax errors)

- [ ] **Step 4: Commit**

```bash
git add teardown-azure.sh
git commit -m "feat: add Azure staging teardown script"
```

---

## Chunk 3: Testing & Verification

### Task 7: Dry-run prerequisites check

This task verifies the scripts are correct before actually deploying. No Azure resources are created.

- [ ] **Step 1: Verify deploy-azure.sh syntax**

Run: `bash -n deploy-azure.sh`
Expected: No output (no syntax errors)

- [ ] **Step 2: Verify teardown-azure.sh syntax**

Run: `bash -n teardown-azure.sh`
Expected: No output (no syntax errors)

- [ ] **Step 3: Verify Dockerfile.prod files exist and are valid**

Run: `head -5 backend/Dockerfile.prod && echo "---" && head -5 frontend/Dockerfile.prod`
Expected:
```
FROM python:3.12-slim
---
FROM node:22-alpine AS builder
```

- [ ] **Step 4: Verify next.config.mjs has standalone output**

Run: `grep -c "standalone" frontend/next.config.mjs`
Expected: `1`

- [ ] **Step 5: Verify .gitignore has .env.azure**

Run: `grep -c ".env.azure" .gitignore`
Expected: `1`

### Task 8: Install Azure CLI (if needed)

This task is a guide — not automated.

- [ ] **Step 1: Install Azure CLI**

Follow: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

On Windows (winget):
```powershell
winget install -e --id Microsoft.AzureCLI
```

- [ ] **Step 2: Log in to Azure**

Run: `az login`
Expected: Browser opens for authentication, CLI shows subscription info.

- [ ] **Step 3: Verify login**

Run: `az account show --query "{name:name, id:id}" -o table`
Expected: Shows your subscription name and ID.

### Task 9: Run full deployment

- [ ] **Step 1: Run the deploy script**

Run: `./deploy-azure.sh`
Expected: Script runs through all steps, prints frontend and backend URLs at the end.
Estimated time: 5-10 minutes (image builds are the slowest part).

- [ ] **Step 2: Verify backend health**

Run: `curl -s https://<BACKEND_FQDN>/api/health`
Expected: `{"status":"ok"}` or similar health response.

Note: The backend may take 30-60 seconds to start on first request (scale-from-zero cold start).

- [ ] **Step 3: Verify frontend loads**

Open the frontend URL in a browser.
Expected: Modelisys login page loads.

- [ ] **Step 4: Verify frontend can reach backend**

Open browser dev tools (Network tab), navigate to login page, attempt a login.
Expected: API requests go to the backend URL (HTTPS), no CORS errors.

### Task 10: Final commit

- [ ] **Step 1: Create final commit with all deployment files**

If any files were not committed in previous tasks:

```bash
git add deploy-azure.sh teardown-azure.sh backend/Dockerfile.prod frontend/Dockerfile.prod frontend/next.config.mjs .gitignore
git commit -m "feat: Azure Container Apps staging deployment

Adds deploy-azure.sh and teardown-azure.sh scripts for one-command
deployment to Azure Container Apps. Includes production Dockerfiles
for both frontend and backend."
```
