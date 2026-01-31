"""Initial schema - all core tables

Revision ID: 001
Revises: None
Create Date: 2026-01-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Organizations
    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Users
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # User-Organization join table (multi-org per user)
    op.create_table(
        "user_organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Enum("admin", "member", "viewer", name="userrole"), default="member", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Companies
    op.create_table(
        "companies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("fiscal_year_end", sa.String(5), nullable=False, server_default="12-31"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="CAD"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Divisions
    op.create_table(
        "divisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Sub-divisions
    op.create_table(
        "sub_divisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("division_id", UUID(as_uuid=True), sa.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Account Groups (org-level)
    op.create_table(
        "account_groups",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("sort_order", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Account Categories
    op.create_table(
        "account_categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("account_group_id", UUID(as_uuid=True), sa.ForeignKey("account_groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sort_order", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Chart of Accounts (per-company, mapped to org-level categories)
    op.create_table(
        "chart_of_accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("account_category_id", UUID(as_uuid=True), sa.ForeignKey("account_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("account_number", sa.String(20), nullable=False),
        sa.Column("account_name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Account Mappings (per-company GL mapping to financial statement lines)
    op.create_table(
        "account_mappings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("account_number", sa.String(20), nullable=False),
        sa.Column("description", sa.String(255), nullable=False, server_default=""),
        sa.Column("link_code", sa.String(50), nullable=True),
        sa.Column("summary_ef", sa.String(50), nullable=True),
        sa.Column("detail_ef", sa.String(50), nullable=True),
        sa.Column("divisions", sa.String(255), nullable=True),
        sa.Column("sub_divisions", sa.String(255), nullable=True),
        sa.Column("fdrhc", sa.Boolean(), server_default="false"),
        sa.Column("interests", sa.Boolean(), server_default="false"),
        sa.Column("amortization", sa.Boolean(), server_default="false"),
        sa.Column("variable_costs", sa.Boolean(), server_default="false"),
        sa.Column("fixed_costs", sa.Boolean(), server_default="false"),
        sa.Column("product", sa.String(255), nullable=True),
        sa.Column("interco_company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Products (per-company)
    op.create_table(
        "products",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Trial Balance Entries
    op.create_table(
        "trial_balance_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("chart_of_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
    )

    # Financial Statement Mappings (org-level statement structure definitions)
    op.create_table(
        "financial_statement_mappings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("mapping_type", sa.String(30), nullable=False),
        sa.Column("structure", JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Company Statement Structures (per-company row layout overrides)
    op.create_table(
        "company_statement_structures",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("statement_type", sa.String(30), nullable=False),
        sa.Column("structure", JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Exchange Rates (monthly currency rates)
    op.create_table(
        "exchange_rates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=True),
        sa.Column("monthly_rates", JSONB, nullable=False, server_default="{}"),
        sa.Column("notes", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Business Risks (evaluation risk assessments)
    op.create_table(
        "business_risks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("risk_id", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("impact", sa.Text(), nullable=True),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("level", sa.String(10), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Forecast Configs (per-entity expense types, inflation, variable rates, seasonality, etc.)
    op.create_table(
        "forecast_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("division_id", UUID(as_uuid=True), sa.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("sub_division_id", UUID(as_uuid=True), sa.ForeignKey("sub_divisions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("config_type", sa.String(50), nullable=False),
        sa.Column("data", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # EBITDA Multiple Notes (evaluation notes)
    op.create_table(
        "ebitda_multiple_notes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("division_id", UUID(as_uuid=True), sa.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("sub_division_id", UUID(as_uuid=True), sa.ForeignKey("sub_divisions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("note_type", sa.String(30), nullable=False),
        sa.Column("data", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Notes
    op.create_table(
        "notes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("division_id", UUID(as_uuid=True), sa.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("sub_division_id", UUID(as_uuid=True), sa.ForeignKey("sub_divisions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("row_id", sa.String(255), nullable=False),
        sa.Column("row_label", sa.String(255), nullable=False),
        sa.Column("page", sa.String(50), nullable=False),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("view", sa.String(20), nullable=False),
        sa.Column("current_amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("prior_amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("variation_percent", sa.Numeric(10, 4), nullable=True),
        sa.Column("variation_amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Projections
    op.create_table(
        "projections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("division_id", UUID(as_uuid=True), sa.ForeignKey("divisions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("sub_division_id", UUID(as_uuid=True), sa.ForeignKey("sub_divisions.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("projection_years", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("projection_mode", sa.String(10), nullable=False, server_default="gl"),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Projection Adjustments
    op.create_table(
        "projection_adjustments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("projection_id", UUID(as_uuid=True), sa.ForeignKey("projections.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("module", sa.String(20), nullable=False),
        sa.Column("row_id", sa.String(255), nullable=False),
        sa.Column("year_index", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("value", sa.Numeric(15, 4), nullable=False),
        sa.Column("is_recurring", sa.Boolean(), default=False),
        sa.Column("note", sa.Text(), nullable=True),
    )

    # Loans
    op.create_table(
        "loans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("projection_id", UUID(as_uuid=True), sa.ForeignKey("projections.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("principal", sa.Numeric(15, 2), nullable=False),
        sa.Column("interest_rate", sa.Numeric(6, 4), nullable=False),
        sa.Column("remaining_payments", sa.Integer(), nullable=False),
        sa.Column("payment_amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("start_month", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    # Budgets
    op.create_table(
        "budgets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Budget Entries
    op.create_table(
        "budget_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("budget_id", UUID(as_uuid=True), sa.ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("chart_of_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("budget_entries")
    op.drop_table("budgets")
    op.drop_table("loans")
    op.drop_table("projection_adjustments")
    op.drop_table("projections")
    op.drop_table("notes")
    op.drop_table("ebitda_multiple_notes")
    op.drop_table("forecast_configs")
    op.drop_table("business_risks")
    op.drop_table("exchange_rates")
    op.drop_table("company_statement_structures")
    op.drop_table("financial_statement_mappings")
    op.drop_table("trial_balance_entries")
    op.drop_table("products")
    op.drop_table("account_mappings")
    op.drop_table("chart_of_accounts")
    op.drop_table("account_categories")
    op.drop_table("account_groups")
    op.drop_table("sub_divisions")
    op.drop_table("divisions")
    op.drop_table("companies")
    op.drop_table("user_organizations")
    op.drop_table("users")
    op.drop_table("organizations")
    op.execute("DROP TYPE IF EXISTS userrole")
