import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExchangeRate(Base):
    """Monthly currency exchange rates. Stores 12 months of rates per currency pair per year."""
    __tablename__ = "exchange_rates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)  # USD, EUR, GBP, etc.
    fiscal_year: Mapped[int | None] = mapped_column(nullable=True)
    monthly_rates: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)  # {"Janvier": 1.35, "Février": 1.34, ...}
    notes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)  # {"Janvier": "note text", ...}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="exchange_rates")
