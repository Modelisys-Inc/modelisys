"""Add RBAC: User.is_superadmin, UserOrganization.all_companies, user_company_access

Revision ID: 018
Revises: 017
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_superadmin", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "user_organizations",
        sa.Column("all_companies", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_table(
        "user_company_access",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "company_id", name="uq_user_company_access_user_company"),
    )
    op.create_index("ix_user_company_access_user_id", "user_company_access", ["user_id"])
    op.create_index("ix_user_company_access_company_id", "user_company_access", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_user_company_access_company_id", table_name="user_company_access")
    op.drop_index("ix_user_company_access_user_id", table_name="user_company_access")
    op.drop_table("user_company_access")
    op.drop_column("user_organizations", "all_companies")
    op.drop_column("users", "is_superadmin")
