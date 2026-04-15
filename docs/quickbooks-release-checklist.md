# QuickBooks Connector — Release Checklist

## Before merging to main

- [ ] All backend tests pass: `cd backend && python -m pytest tests/integrations/quickbooks/`
- [ ] Frontend typechecks (no QBO regressions): `cd frontend && pnpm tsc --noEmit`
- [ ] `.env` contains `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, and `QBO_TOKEN_ENCRYPTION_KEY`
- [ ] `backend/.env.example` documents the new vars
- [ ] Manual sandbox smoke test passes (see below)

## Sandbox setup (one-time per developer)

1. Create an Intuit developer account at https://developer.intuit.com.
2. Create a new app, select the **Accounting** scope only.
3. In the app's **Keys & OAuth (Sandbox)** tab, copy `Client ID` and `Client Secret`.
4. Add a Redirect URI: `http://localhost:8000/api/quickbooks/callback`.
5. Generate a Fernet encryption key:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
6. Populate `.env` (gitignored):
   ```
   INTUIT_CLIENT_ID=<from step 3>
   INTUIT_CLIENT_SECRET=<from step 3>
   INTUIT_ENVIRONMENT=sandbox
   INTUIT_REDIRECT_URI=http://localhost:8000/api/quickbooks/callback
   QBO_TOKEN_ENCRYPTION_KEY=<from step 5>
   ```

## Manual sandbox smoke test

1. Run the stack: `docker-compose up` (or backend + frontend separately).
2. Sign in to Modelisys; create or open a Company.
3. In a separate browser tab, sign in to https://developer.intuit.com → Sandbox dashboard. Confirm a sandbox QBO company exists with seeded TB data (Intuit provides one by default).
4. In Modelisys, navigate to **Settings → Companies → {company} → QuickBooks**.
5. Click **Connect QuickBooks**. Authorize on Intuit's screen.
6. Confirm the redirect lands on the QuickBooks page with status "Connected" and a realm ID shown.
7. Pick a fiscal year + month with seeded data; click **Preview trial balance**.
8. Confirm the table renders with mapping proposals.
9. Click **Import trial balance**. Confirm the success banner with imported counts.
10. Navigate to **Settings → Companies → {company} → Balance de vérification** for the same company/period — confirm imported entries appear.
11. Re-run the import for the same period; confirm 409 → overwrite modal → success.
12. Click **Disconnect**; confirm status returns to "Not connected".

## Customizing mapping rules

The default `backend/app/integrations/quickbooks/mapping_rules.py` uses generic
French link codes (e.g., `actif.encaisse`, `revenus.ventes_produits`). You **must**
customize the dict to match the link codes used by your organization's
`FinancialStatementMapping.structure`. The review screen lets users override
proposals per row, but accurate proposals dramatically reduce onboarding time.

To audit which link codes your org actually uses:
```sql
SELECT DISTINCT structure FROM financial_statement_mappings
 WHERE organization_id = '<your-org-id>';
```
Then walk the JSON structures (each is a tree containing `link_code` keys) and
update `_HIGH_CONFIDENCE` / `_MEDIUM_CONFIDENCE` in `mapping_rules.py`.

## Production app review (Intuit)

When ready to support live QBO files:
1. Submit the app for review in the Intuit developer portal. Requires:
   - Working demo (Loom or live URL).
   - Privacy policy URL.
   - Terms of service URL.
2. Typical turnaround: 1–4 weeks.
3. Once approved, set `INTUIT_ENVIRONMENT=production` and the production
   `INTUIT_CLIENT_ID` / `INTUIT_CLIENT_SECRET` in Azure Container Apps env.
4. No code change required — the `intuit_api_base` property switches automatically.
