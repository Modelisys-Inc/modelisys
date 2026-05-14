# QuickBooks Connector — Release Checklist

## Before merging to main

- [ ] All backend tests pass: `cd backend && python -m pytest tests/integrations/quickbooks/`
- [ ] Frontend typechecks (no new QBO regressions): `cd frontend && pnpm tsc --noEmit`
- [ ] Frontend builds: `cd frontend && pnpm build`
- [ ] `.env` contains `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, `INTUIT_ENVIRONMENT`, `INTUIT_REDIRECT_URI`, and `QBO_TOKEN_ENCRYPTION_KEY`
- [ ] `backend/.env.example` documents the new vars
- [ ] Manual sandbox smoke test passes (see below)
- [ ] Company in the test DB has `CompanyStatementStructure` rows for the
      statement types its QBO accounts will map to. Without them, the
      strict picker is empty and the user can only create new codes from
      scratch — workable, but not the intended onboarding path.

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
2. Sign in to Modelisys; create or open a Company. Make sure the company
   has `CompanyStatementStructure` rows for at least one statement type
   (or expect to create codes inline during the test).
3. In a separate browser tab, sign in to https://developer.intuit.com →
   Sandbox dashboard. Confirm a sandbox QBO company exists with seeded TB
   data (Intuit provides one by default).
4. In Modelisys, navigate to **Settings → Companies → {company} → QuickBooks**.
5. Click **Connect QuickBooks**. Authorize on Intuit's screen.
6. Confirm the redirect lands on the QuickBooks page with status "Connected"
   and a realm ID shown.
7. Pick a fiscal year + month with seeded data; click **Preview trial balance**.
8. Confirm the table renders with one row per QBO account. The table is
   `table-fixed` (no horizontal scroll), Account # / Name / QBO type columns
   truncate with hover-titles, and each row shows a **Link code** combobox
   trigger that says "Pick a link code" until a code is chosen.
9. For each non-skipped row, either pick an existing code from the combobox
   or click **+ Create new link code…** to add one inline (picks a statement
   type + parent section, fills code + label, submits).
10. **Bulk path:** check several rows (or use **Select all visible**), then
    use the green selection bar's **Apply link code…** to set them all at
    once. The selection bar should also offer **Skip** / **Unskip**.
11. **Zero-amount path:** if there are unskipped rows with debit=0 AND
    credit=0, the **Skip N zero-amount rows** action in the header skips
    them in one click.
12. **YTD reminder:** confirm the caption "QBO imports are stored as
    year-to-date (cumulative)…" is visible under the title.
13. **Invalid signaling:** if any row's `link_code` is set but not in the
    structure (e.g., an `existing_link_code` from a prior import that the
    user has since removed), the row should have a red background, a
    "Code not in structure" caption, and the **Invalid (N)** filter +
    amber banner should appear. **Import trial balance** is disabled in
    that state.
14. Click **Import trial balance**. Confirm the success banner with
    imported counts.
15. Navigate to **Settings → Companies → {company} → Balance de vérification**
    for the same company/period — confirm imported entries appear.
16. Re-run the import for the same period; confirm 409 → overwrite modal
    → success.
17. **Cumulative flag:** confirm the company's `is_cumulative_tb` column
    is now `true` (the commit forces it).
18. Click **Disconnect**; confirm status returns to "Not connected".

## Statement structure prerequisites

The picker reads valid codes from `CompanyStatementStructure` (per company,
per statement type) — there is no longer a generic auto-proposal table.

Real-world structures use multiple shapes:
- Tree via `children` (seed-style, with explicit `id` fields).
- Tree via `detailRows` (production-edited income statements).
- Flat (sections and leaves as siblings, identified by `label` only).

The `POST /api/quickbooks/companies/{id}/link-codes` endpoint handles all
three when creating new codes inline. The strict commit validation walks
both `children` and `detailRows` and matches codes via `linkCode` (camelCase)
or `link_code` (snake_case).

To audit which codes a company actually has:
```sql
SELECT statement_type, structure
  FROM company_statement_structures
 WHERE company_id = '<your-company-id>';
```

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
