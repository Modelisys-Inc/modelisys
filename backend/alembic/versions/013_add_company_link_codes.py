"""Add company_link_codes table (per-company tenant-local overlay codes)

Revision ID: 013
Revises: 012
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_link_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.Column("promoted_to_standard_code", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "code", name="uq_company_link_codes_company_code"),
    )
    op.create_index("ix_company_link_codes_company_id", "company_link_codes", ["company_id"])
    op.create_index("ix_company_link_codes_company_family", "company_link_codes", ["company_id", "family"])
    op.create_index("ix_company_link_codes_company_is_leaf", "company_link_codes", ["company_id", "is_leaf"])


def downgrade() -> None:
    op.drop_index("ix_company_link_codes_company_is_leaf", table_name="company_link_codes")
    op.drop_index("ix_company_link_codes_company_family", table_name="company_link_codes")
    op.drop_index("ix_company_link_codes_company_id", table_name="company_link_codes")
    op.drop_table("company_link_codes")
