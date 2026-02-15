"""Add missing indexes, composite indexes, and unique constraints

Revision ID: 002
Revises: 001
Create Date: 2026-02-06

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # 1. Missing FK indexes
    # =========================================================================

    # user_organizations
    op.create_index("ix_user_organizations_user_id", "user_organizations", ["user_id"])
    op.create_index("ix_user_organizations_organization_id", "user_organizations", ["organization_id"])

    # chart_of_accounts
    op.create_index("ix_chart_of_accounts_account_category_id", "chart_of_accounts", ["account_category_id"])

    # account_mappings
    op.create_index("ix_account_mappings_interco_company_id", "account_mappings", ["interco_company_id"])

    # business_risks
    op.create_index("ix_business_risks_company_id", "business_risks", ["company_id"])

    # notes
    op.create_index("ix_notes_company_id", "notes", ["company_id"])
    op.create_index("ix_notes_division_id", "notes", ["division_id"])
    op.create_index("ix_notes_sub_division_id", "notes", ["sub_division_id"])
    op.create_index("ix_notes_created_by_id", "notes", ["created_by_id"])

    # projections
    op.create_index("ix_projections_company_id", "projections", ["company_id"])
    op.create_index("ix_projections_division_id", "projections", ["division_id"])
    op.create_index("ix_projections_sub_division_id", "projections", ["sub_division_id"])
    op.create_index("ix_projections_created_by_id", "projections", ["created_by_id"])

    # budgets
    op.create_index("ix_budgets_created_by_id", "budgets", ["created_by_id"])

    # forecast_configs
    op.create_index("ix_forecast_configs_company_id", "forecast_configs", ["company_id"])
    op.create_index("ix_forecast_configs_division_id", "forecast_configs", ["division_id"])
    op.create_index("ix_forecast_configs_sub_division_id", "forecast_configs", ["sub_division_id"])

    # ebitda_multiple_notes
    op.create_index("ix_ebitda_multiple_notes_company_id", "ebitda_multiple_notes", ["company_id"])
    op.create_index("ix_ebitda_multiple_notes_division_id", "ebitda_multiple_notes", ["division_id"])
    op.create_index("ix_ebitda_multiple_notes_sub_division_id", "ebitda_multiple_notes", ["sub_division_id"])

    # =========================================================================
    # 2. Composite indexes for query performance
    # =========================================================================

    # trial_balance_entries: core financial queries by company + fiscal year (+ month)
    op.create_index(
        "ix_trial_balance_entries_company_fiscal_year",
        "trial_balance_entries",
        ["company_id", "fiscal_year"],
    )
    op.create_index(
        "ix_trial_balance_entries_company_fiscal_year_month",
        "trial_balance_entries",
        ["company_id", "fiscal_year", "month"],
    )

    # budget_entries: monthly budget lookups
    op.create_index(
        "ix_budget_entries_budget_month",
        "budget_entries",
        ["budget_id", "month"],
    )

    # account_mappings: link_code joins for financial statements
    op.create_index(
        "ix_account_mappings_company_link_code",
        "account_mappings",
        ["company_id", "link_code"],
    )

    # account_mappings: account number lookups
    op.create_index(
        "ix_account_mappings_company_account_number",
        "account_mappings",
        ["company_id", "account_number"],
    )

    # notes: filtering by page
    op.create_index(
        "ix_notes_company_page",
        "notes",
        ["company_id", "page"],
    )

    # business_risks: listing per company within org
    op.create_index(
        "ix_business_risks_org_company",
        "business_risks",
        ["organization_id", "company_id"],
    )

    # forecast_configs: config lookups by type
    op.create_index(
        "ix_forecast_configs_org_company_type",
        "forecast_configs",
        ["organization_id", "company_id", "config_type"],
    )

    # =========================================================================
    # 3. Unique constraints
    # =========================================================================

    # A user can only belong to an organization once
    op.create_unique_constraint(
        "uq_user_organizations_user_org",
        "user_organizations",
        ["user_id", "organization_id"],
    )

    # One exchange rate set per currency per fiscal year per org
    op.create_unique_constraint(
        "uq_exchange_rates_org_currency_year",
        "exchange_rates",
        ["organization_id", "currency", "fiscal_year"],
    )

    # One statement structure per type per company
    op.create_unique_constraint(
        "uq_company_statement_structures_company_type",
        "company_statement_structures",
        ["company_id", "statement_type"],
    )

    # One mapping per type per organization
    op.create_unique_constraint(
        "uq_financial_statement_mappings_org_type",
        "financial_statement_mappings",
        ["organization_id", "mapping_type"],
    )

    # Account numbers unique per company
    op.create_unique_constraint(
        "uq_chart_of_accounts_company_account_number",
        "chart_of_accounts",
        ["company_id", "account_number"],
    )

    # One trial balance entry per account per fiscal year per month
    op.create_unique_constraint(
        "uq_trial_balance_entries_company_account_year_month",
        "trial_balance_entries",
        ["company_id", "account_id", "fiscal_year", "month"],
    )

    # One budget entry per account per month per budget
    op.create_unique_constraint(
        "uq_budget_entries_budget_account_month",
        "budget_entries",
        ["budget_id", "account_id", "month"],
    )


def downgrade() -> None:
    # Drop unique constraints (reverse order)
    op.drop_constraint("uq_budget_entries_budget_account_month", "budget_entries")
    op.drop_constraint("uq_trial_balance_entries_company_account_year_month", "trial_balance_entries")
    op.drop_constraint("uq_chart_of_accounts_company_account_number", "chart_of_accounts")
    op.drop_constraint("uq_financial_statement_mappings_org_type", "financial_statement_mappings")
    op.drop_constraint("uq_company_statement_structures_company_type", "company_statement_structures")
    op.drop_constraint("uq_exchange_rates_org_currency_year", "exchange_rates")
    op.drop_constraint("uq_user_organizations_user_org", "user_organizations")

    # Drop composite indexes
    op.drop_index("ix_forecast_configs_org_company_type", "forecast_configs")
    op.drop_index("ix_business_risks_org_company", "business_risks")
    op.drop_index("ix_notes_company_page", "notes")
    op.drop_index("ix_account_mappings_company_account_number", "account_mappings")
    op.drop_index("ix_account_mappings_company_link_code", "account_mappings")
    op.drop_index("ix_budget_entries_budget_month", "budget_entries")
    op.drop_index("ix_trial_balance_entries_company_fiscal_year_month", "trial_balance_entries")
    op.drop_index("ix_trial_balance_entries_company_fiscal_year", "trial_balance_entries")

    # Drop FK indexes
    op.drop_index("ix_ebitda_multiple_notes_sub_division_id", "ebitda_multiple_notes")
    op.drop_index("ix_ebitda_multiple_notes_division_id", "ebitda_multiple_notes")
    op.drop_index("ix_ebitda_multiple_notes_company_id", "ebitda_multiple_notes")
    op.drop_index("ix_forecast_configs_sub_division_id", "forecast_configs")
    op.drop_index("ix_forecast_configs_division_id", "forecast_configs")
    op.drop_index("ix_forecast_configs_company_id", "forecast_configs")
    op.drop_index("ix_budgets_created_by_id", "budgets")
    op.drop_index("ix_projections_created_by_id", "projections")
    op.drop_index("ix_projections_sub_division_id", "projections")
    op.drop_index("ix_projections_division_id", "projections")
    op.drop_index("ix_projections_company_id", "projections")
    op.drop_index("ix_notes_created_by_id", "notes")
    op.drop_index("ix_notes_sub_division_id", "notes")
    op.drop_index("ix_notes_division_id", "notes")
    op.drop_index("ix_notes_company_id", "notes")
    op.drop_index("ix_business_risks_company_id", "business_risks")
    op.drop_index("ix_account_mappings_interco_company_id", "account_mappings")
    op.drop_index("ix_chart_of_accounts_account_category_id", "chart_of_accounts")
    op.drop_index("ix_user_organizations_organization_id", "user_organizations")
    op.drop_index("ix_user_organizations_user_id", "user_organizations")
