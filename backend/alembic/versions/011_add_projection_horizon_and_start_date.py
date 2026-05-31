"""Add projection horizon and start date

Revision ID: 009
Revises: 008
Create Date: 2026-05-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projections",
        sa.Column("projection_horizon", sa.String(20), nullable=False, server_default="annual"),
    )
    op.add_column(
        "projections",
        sa.Column("start_year", sa.Integer(), nullable=True),
    )
    op.add_column(
        "projections",
        sa.Column("start_month", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("projections", "start_month")
    op.drop_column("projections", "start_year")
    op.drop_column("projections", "projection_horizon")

