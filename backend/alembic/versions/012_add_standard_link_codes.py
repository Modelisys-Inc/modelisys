"""Add standard_link_codes table (global standardized chart of accounts)

Revision ID: 012
Revises: 011
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "standard_link_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("parent_code", sa.String(length=20), nullable=True),
        sa.Column("family", sa.String(length=10), nullable=False),
        sa.Column("label_account", sa.String(length=255), nullable=True),
        sa.Column("label_sub_account", sa.String(length=255), nullable=True),
        sa.Column("account_type", sa.String(length=50), nullable=True),
        sa.Column("account_sub_type", sa.String(length=100), nullable=True),
        sa.Column("variable_or_fixed", sa.String(length=20), nullable=True),
        sa.Column("ft_category", sa.String(length=200), nullable=True),
        sa.Column("ft_line_item", sa.String(length=300), nullable=True),
        sa.Column("projections", sa.String(length=200), nullable=True),
        sa.Column("is_leaf", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_standard_link_codes_code"),
    )
    op.create_index("ix_standard_link_codes_family", "standard_link_codes", ["family"])
    op.create_index("ix_standard_link_codes_is_leaf", "standard_link_codes", ["is_leaf"])


def downgrade() -> None:
    op.drop_index("ix_standard_link_codes_is_leaf", table_name="standard_link_codes")
    op.drop_index("ix_standard_link_codes_family", table_name="standard_link_codes")
    op.drop_table("standard_link_codes")
