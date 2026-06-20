"""Add promotion_status to company_link_codes (curated promotion, Phase 4)

Revision ID: 017
Revises: 016
"""

from alembic import op
import sqlalchemy as sa


revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "company_link_codes",
        sa.Column("promotion_status", sa.String(length=20), nullable=False, server_default="pending"),
    )


def downgrade() -> None:
    op.drop_column("company_link_codes", "promotion_status")
