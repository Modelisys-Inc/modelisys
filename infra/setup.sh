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
LOCATION="eastus"
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

# --- Register required resource providers ------------------------------------
PROVIDERS=("Microsoft.ContainerRegistry" "Microsoft.App" "Microsoft.DBforPostgreSQL" "Microsoft.OperationalInsights")
for PROVIDER in "${PROVIDERS[@]}"; do
  STATE=$(az provider show --namespace "$PROVIDER" --query "registrationState" -o tsv 2>/dev/null)
  if [ "$STATE" != "Registered" ]; then
    info "Registering provider: $PROVIDER"
    az provider register --namespace "$PROVIDER" --output none
  fi
done

# Wait for providers to register
for PROVIDER in "${PROVIDERS[@]}"; do
  STATE=$(az provider show --namespace "$PROVIDER" --query "registrationState" -o tsv 2>/dev/null)
  while [ "$STATE" != "Registered" ]; do
    info "Waiting for $PROVIDER to register..."
    sleep 10
    STATE=$(az provider show --namespace "$PROVIDER" --query "registrationState" -o tsv 2>/dev/null)
  done
done
info "All resource providers registered"

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

DB_ALREADY_EXISTS=false
if az postgres flexible-server show --name "$DB_SERVER" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  DB_ALREADY_EXISTS=true
  info "PostgreSQL server already exists, skipping creation"
  info "NOTE: You must provide the existing DB password when prompted."
  read -sp "Enter existing PostgreSQL admin password: " DB_PASSWORD
  echo ""
else
  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

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
    --public-access none \
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
if az containerapp show --name "$BACKEND_APP" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  info "Backend container app already exists, updating..."
  az containerapp update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$BACKEND_APP" \
    --set-env-vars \
      "DATABASE_URL=secretref:database-url" \
      "JWT_SECRET_KEY=secretref:jwt-secret" \
      "ENVIRONMENT=production" \
      "CORS_ORIGINS=https://app.modelisys.com" \
      "FRONTEND_URL=https://app.modelisys.com" \
    --output none
else
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
fi

# --- Frontend Container App --------------------------------------------------
if az containerapp show --name "$FRONTEND_APP" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  info "Frontend container app already exists, updating..."
  az containerapp update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FRONTEND_APP" \
    --set-env-vars \
      "NEXT_PUBLIC_API_URL=https://api.modelisys.com" \
      "NODE_ENV=production" \
    --output none
else
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
fi

# --- PostgreSQL Firewall: Allow Container Apps outbound IPs -------------------
info "Configuring PostgreSQL firewall for Container Apps..."
OUTBOUND_IPS=$(az containerapp env show \
  --name "$CONTAINER_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.staticIp" -o tsv 2>/dev/null || true)

if [ -n "$OUTBOUND_IPS" ]; then
  az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DB_SERVER" \
    --rule-name "AllowContainerApps" \
    --start-ip-address "$OUTBOUND_IPS" \
    --end-ip-address "$OUTBOUND_IPS" \
    --output none 2>/dev/null || info "Firewall rule already exists"
  info "PostgreSQL firewall configured for Container Apps IP: $OUTBOUND_IPS"
else
  info "WARNING: Could not determine Container Apps outbound IP. You may need to configure the PostgreSQL firewall manually."
fi

# --- Service Principal for GitHub Actions ------------------------------------
info "Creating service principal: $SP_NAME"
SP_JSON=$(az ad sp create-for-rbac \
  --name "$SP_NAME" \
  --role Contributor \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
  --json-auth 2>/dev/null || true)

if [ -z "$SP_JSON" ]; then
  info "Service principal may already exist. Resetting credentials..."
  SP_APP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv)
  SP_JSON=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role Contributor \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
    --json-auth)
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
