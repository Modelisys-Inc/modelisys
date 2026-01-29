import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ForecastConfig(Base):
    """Per-entity forecast configuration. Stores expense types (variable/fixe),
    inflation rates, variable rates, seasonality configs, etc.
    Uses JSON for flexible key-value storage since the data is keyed by rowId."""
    __tablename__ = "forecast_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="CASCADE"), nullable=True)
    sub_division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sub_divisions.id", ondelete="CASCADE"), nullable=True)
    config_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Config types:
    #   expense_types        - {"rowId": "variable" | "fixe"}
    #   inflation_rate       - {"rate": 2.0}
    #   variable_rates       - {"rowId": 15.5}
    #   specific_inflation   - {"rowId": 2.5}
    #   base_seasonality     - {"rowId-month": [12.5, 11.2, ...]}
    #   seasonality_adj      - {"rowId": [{id, monthIndex, percentage, note}]}
    #   capex_depreciation   - {"rowId": 8.0}
    #   fdr_types            - {"rowId": "percentRevenue" | "percentCost" | "manual"}
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="forecast_configs")


class EbitdaMultipleNote(Base):
    """EBITDA multiple evaluation notes — adjustment notes, weight notes, range notes, multiple notes."""
    __tablename__ = "ebitda_multiple_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="CASCADE"), nullable=True)
    sub_division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sub_divisions.id", ondelete="CASCADE"), nullable=True)
    note_type: Mapped[str] = mapped_column(String(30), nullable=False)  # adjustment, weight, range, multiple
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="ebitda_multiple_notes")
