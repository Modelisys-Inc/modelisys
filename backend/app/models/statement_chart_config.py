import uuid
from datetime import datetime

from sqlalchemy import JSON, Index, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StatementChartConfig(Base):
    __tablename__ = "statement_chart_configs"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "statement_type", "chart_instance_id",
            name="uq_chart_configs_company_statement_instance",
        ),
        Index(
            "ix_chart_configs_company_statement",
            "company_id", "statement_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    statement_type: Mapped[str] = mapped_column(String(32), nullable=False)
    # "income-statement" | "balance-sheet" | "cash-flow"
    chart_instance_id: Mapped[str] = mapped_column(String(64), nullable=False)
    # "default" for the first slot; uuid strings for additional slots
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    config_json: Mapped[dict] = mapped_column(
        JSON().with_variant(JSONB(astext_type=Text()), "postgresql"),
        nullable=False,
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
