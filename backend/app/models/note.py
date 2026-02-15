import uuid
from datetime import datetime

from sqlalchemy import Index, String, Text, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (
        Index("ix_notes_company_page", "company_id", "page"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="CASCADE"), nullable=True, index=True)
    sub_division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sub_divisions.id", ondelete="CASCADE"), nullable=True, index=True)

    row_id: Mapped[str] = mapped_column(String(255), nullable=False)
    row_label: Mapped[str] = mapped_column(String(255), nullable=False)
    page: Mapped[str] = mapped_column(String(50), nullable=False)  # income-statement, balance-sheet, cash-flow, etc.
    period: Mapped[str] = mapped_column(String(20), nullable=False)  # monthly, quarterly, annual
    view: Mapped[str] = mapped_column(String(20), nullable=False)  # comparison, ytd, ddm, 12months, quarters, years

    # Snapshot of financial data at note creation
    current_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    prior_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)
    variation_percent: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    variation_amount: Mapped[float | None] = mapped_column(Numeric(15, 2), nullable=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="notes")
    created_by_user = relationship("User", back_populates="notes")
