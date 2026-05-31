"""Add projection horizon and start date

Revision ID: 011
Revises: 010
Create Date: 2026-05-07

Note: originally authored as revision "009" on a parallel branch, which
collided with 009_add_note_reference_and_fiscal_year. Re-chained after 010
to restore a single linear head. This migration was never applied under the
old (duplicate) id, so it runs here to add the missing projections columns.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "011"
down_revision: Union[str, None] = "010"
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

