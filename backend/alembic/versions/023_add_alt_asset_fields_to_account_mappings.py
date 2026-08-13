"""add alt asset cost fields to account_mappings

Revision ID: 023
Revises: 022
Create Date: 2026-08-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "account_mappings",
        sa.Column("alt_asset_cost", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "account_mappings",
        sa.Column(
            "alt_accumulated_amortization",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("account_mappings", "alt_accumulated_amortization")
    op.drop_column("account_mappings", "alt_asset_cost")
