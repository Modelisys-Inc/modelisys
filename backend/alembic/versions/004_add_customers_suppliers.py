"""Add customers, suppliers tables and customer/supplier columns to account_mappings

Revision ID: 004
Revises: 003
Create Date: 2026-02-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create customers table
    op.create_table(
        "customers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sort_order", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_customers_company_id", "customers", ["company_id"])

    # Create suppliers table
    op.create_table(
        "suppliers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sort_order", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_suppliers_company_id", "suppliers", ["company_id"])

    # Add customer and supplier columns to account_mappings
    op.add_column("account_mappings", sa.Column("customer", sa.String(255), nullable=True))
    op.add_column("account_mappings", sa.Column("supplier", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("account_mappings", "supplier")
    op.drop_column("account_mappings", "customer")
    op.drop_index("ix_suppliers_company_id", table_name="suppliers")
    op.drop_table("suppliers")
    op.drop_index("ix_customers_company_id", table_name="customers")
    op.drop_table("customers")
