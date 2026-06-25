---
name: link-code-architecture-roadmap
description: Sequenced roadmap for the shared/tenant chart-of-accounts (link codes) data architecture
metadata:
  type: project
---

Roadmap for the multi-tenant chart-of-accounts ("link codes") architecture, agreed in a brainstorm on 2026-06-20. Decision: new client-created codes **stay tenant-local by default**; curated promotion is the only path into the shared registry (no auto-share).

- **Phase 1 — Storage scale (DONE 2026-06-20, full scope):** `trial_balance_entries` RANGE-partitioned by `fiscal_year` (Postgres, migration 015; composite PK `(id, fiscal_year)`; DEFAULT + yearly partitions; plain table on SQLite). Rollup `account_annual_balances` (model `AccountAnnualBalance`) + `tb_rollup.refresh_annual_balances` hooked into all TB write paths + `GET .../trial-balance/annual-summary`. Done as a clean drop+recreate because there are no customers/data yet. NOTE: compute still reads raw entries; rollup is a derived cache for dashboards.
- **Phase 2 — Tenant-local overlay (DONE 2026-06-20):** `CompanyLinkCode` table + `link_code_resolver` + create endpoint + pickers + frontend panel + e2e. See CLAUDE.md "Link codes".
- **Phase 3 — Registry versioning (DONE 2026-06-20, lightweight scope):** `CoaVersion` audit table, `Company.coa_version` cohort stamp, `StandardLinkCode.is_active`/`deprecated_at`/`coa_version`, seed refactored to dialect-agnostic `apply_records` (version bump + additive upsert + tombstone). KEY FINDING that reduced scope: compute reads the per-company `CompanyStatementStructure` snapshot (taken at company creation), NOT live `standard_link_codes` — so existing companies were already insulated from re-seed mutation; the brainstorm's "retroactive corruption" landmine did not actually exist. Full valid_from/valid_to + version-stamped-mappings was deemed over-engineering and skipped.
- **Phase 4 — Curated promotion (DONE 2026-06-20):** `CompanyLinkCode.promotion_status` (pending/promoted/rejected); curator API `/api/coa/promotion-candidates` (list/promote/reject, org-scoped) in `app/routers/coa_promotion.py` + `app/services/coa_promotion.py`. Dedup suggestion by rollup signature (family + ft_category + account_type). Promote = link-to-existing OR additively publish a new global code as a fresh CoaVersion; sets `promoted_to_standard_code`. Frontend: `CoaPromotionQueue` at `/settings/coa-promotion` + e2e. ALL 4 PHASES COMPLETE.

Context: there is already a global registry (`standard_link_codes`, seeded from `data/MO.xlsx`); this was NOT greenfield. The brainstorm's deep framing: the shared thing is *meaning* (concepts), use immutable versioned base + per-tenant copy-on-write overlay, never mutate global codes.
