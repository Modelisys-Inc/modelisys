"""Add variable_cost_revenue_link_code to account_mappings

Revision ID: 021
Revises: 020
"""

from alembic import op
import sqlalchemy as sa


revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "account_mappings",
        sa.Column("variable_cost_revenue_link_code", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("account_mappings", "variable_cost_revenue_link_code")
