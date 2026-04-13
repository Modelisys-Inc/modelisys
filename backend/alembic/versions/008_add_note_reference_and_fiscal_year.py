"""Add reference month/year and fiscal year to notes

Revision ID: 008
Revises: 007
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("reference_month", sa.SmallInteger(), nullable=True))
    op.add_column("notes", sa.Column("reference_year", sa.SmallInteger(), nullable=True))
    op.add_column("notes", sa.Column("fiscal_year", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("notes", "fiscal_year")
    op.drop_column("notes", "reference_year")
    op.drop_column("notes", "reference_month")
