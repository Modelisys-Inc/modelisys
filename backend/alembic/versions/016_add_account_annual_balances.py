"""Add account_annual_balances rollup table (annual total per GL account)

Revision ID: 016
Revises: 015
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_annual_balances",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False, server_default="0"),
        sa.Column("month_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["chart_of_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id", "account_id", "fiscal_year",
            name="uq_account_annual_balances_company_account_year",
        ),
    )
    op.create_index("ix_account_annual_balances_company_id", "account_annual_balances", ["company_id"])
    op.create_index("ix_account_annual_balances_account_id", "account_annual_balances", ["account_id"])
    op.create_index(
        "ix_account_annual_balances_company_fiscal_year",
        "account_annual_balances", ["company_id", "fiscal_year"],
    )


def downgrade() -> None:
    op.drop_index("ix_account_annual_balances_company_fiscal_year", table_name="account_annual_balances")
    op.drop_index("ix_account_annual_balances_account_id", table_name="account_annual_balances")
    op.drop_index("ix_account_annual_balances_company_id", table_name="account_annual_balances")
    op.drop_table("account_annual_balances")
