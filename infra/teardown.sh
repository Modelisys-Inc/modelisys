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
