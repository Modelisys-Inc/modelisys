"""Add projection_id to forecast_configs

Revision ID: 006
Revises: 005
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "forecast_configs",
        sa.Column(
            "projection_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projections.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_forecast_configs_projection_id",
        "forecast_configs",
        ["projection_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_forecast_configs_projection_id", table_name="forecast_configs")
    op.drop_column("forecast_configs", "projection_id")
