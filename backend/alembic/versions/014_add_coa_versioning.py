"""Add COA versioning: coa_versions table, tombstone/version cols, company stamp

Revision ID: 014
Revises: 013
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "coa_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=100), nullable=False, server_default="MO.xlsx"),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("code_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tombstoned_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version", name="uq_coa_versions_version"),
    )

    op.add_column(
        "standard_link_codes",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "standard_link_codes",
        sa.Column("deprecated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "standard_link_codes",
        sa.Column("coa_version", sa.Integer(), nullable=True),
    )

    op.add_column(
        "companies",
        sa.Column("coa_version", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("companies", "coa_version")
    op.drop_column("standard_link_codes", "coa_version")
    op.drop_column("standard_link_codes", "deprecated_at")
    op.drop_column("standard_link_codes", "is_active")
    op.drop_table("coa_versions")
