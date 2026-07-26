"""Add liability term fields to account_mappings

Revision ID: 022
Revises: 021
"""

from alembic import op
import sqlalchemy as sa


revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "account_mappings",
        sa.Column("liability_remaining_years", sa.Numeric(8, 2), nullable=True),
    )
    op.add_column(
        "account_mappings",
        sa.Column("liability_interest_rate", sa.Numeric(8, 4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("account_mappings", "liability_interest_rate")
    op.drop_column("account_mappings", "liability_remaining_years")
