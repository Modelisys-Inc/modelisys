"""Add attached_link_codes to standard_link_codes for Trésorerie families

Revision ID: 020
Revises: 019

Linearized after merging main: this migration originally branched from 012 as a
second "013". main's chart-of-accounts chain (013_add_company_link_codes → 019)
is the deployed history, so this additive column now applies on top of 019.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "standard_link_codes",
        sa.Column(
            "attached_link_codes",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("standard_link_codes", "attached_link_codes")
