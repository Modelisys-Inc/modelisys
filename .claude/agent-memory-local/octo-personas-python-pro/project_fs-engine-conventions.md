---
name: fs-engine-conventions
description: Non-obvious conventions of backend/app/services/financial_statements.py (sign rules, family extraction, sync sessions) used by the diagnostic feature
metadata:
  type: project
---

Key facts about the financial-statements compute engine (verified 2026-07-26 while building `/api/companies/{id}/diagnostic`):

- **Backend is SYNC SQLAlchemy** (`db.query(...)`, `sessionmaker`, plain `def` endpoints) despite docs sometimes saying "SQLAlchemy 2.0 async". New services/routers must be sync.
- **Sign convention:** TB stores raw debit/credit amounts. `_dt_ct_multiplier_for_account` applies ×(−1) to CT families (REV, PCT, PLT, CAP) based on the account's own mapping `link_code` **prefix** (`derive_link_code_family("REV-A.1") → "REV"`), NOT the DB `family` column. So seed revenue/liability/equity test amounts as **negative** to get positive computed values.
- **Metric extraction without label matching:** group mapped link codes by prefix family (REV/CMV/EXP/ADM/VNT/FIN/AUT/IMP; ACT/ALT/PCT/PLT/CAP) and sum with `_sum_for_link_codes_aggregate`. Result rows like « Bénéfice brut »/« BAIIA » in structures often have NO formula and compute to 0 — never rely on them.
- **`TrialBalanceEntry.fiscal_year` stores the CALENDAR year**; for non-December FY-end, fiscal year = cal_year+1 when month > fy_end_month (see `_fetch_fiscal_year_entries`).
- **Filters:** `_product_filter_ctx` (ContextVar) + `division_filter` (name) / `division_uuid` both passed; matching is CSV-token based on `AccountMapping.divisions/product`. Accounts with no mapping tokens are EXCLUDED when a filter is active.
- **AccountMapping has boolean flags** `amortization`, `interests` — better than label matching for identifying D&A/interest accounts.
- **Balance sheet months:** non-cumulative TB → use only the last month with data (closing balance); cumulative TB → sum de-cumulated months 1..last.
- Empty path `@router.get("")` on a prefixed APIRouter is the established repo pattern (see trial_balance router).

**How to apply:** any new server-side aggregation (diagnostics, dashboards) should reuse `_build_fiscal_year_data_multi` + family-code sums from `app/services/company_diagnostic.py` as the template.
