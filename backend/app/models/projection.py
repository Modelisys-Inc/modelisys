import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, Text, Numeric, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Projection(Base):
    __tablename__ = "projections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="CASCADE"), nullable=True)
    sub_division_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("sub_divisions.id", ondelete="CASCADE"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    projection_years: Mapped[int] = mapped_column(Integer, nullable=False, default=5)  # 3, 4, or 5
    projection_mode: Mapped[str] = mapped_column(String(10), nullable=False, default="gl")  # gl or account

    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="projections")
    created_by_user = relationship("User", back_populates="projections")
    adjustments = relationship("ProjectionAdjustment", back_populates="projection", cascade="all, delete-orphan")
    loans = relationship("Loan", back_populates="projection", cascade="all, delete-orphan")


class ProjectionAdjustment(Base):
    __tablename__ = "projection_adjustments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    projection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projections.id", ondelete="CASCADE"), nullable=False, index=True)
    module: Mapped[str] = mapped_column(String(20), nullable=False)  # revenue, expenses, capex, debt, fdr
    row_id: Mapped[str] = mapped_column(String(255), nullable=False)
    year_index: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-4
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # amount, percentage, growthPercent, growthAmount
    value: Mapped[float] = mapped_column(Numeric(15, 4), nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    projection = relationship("Projection", back_populates="adjustments")


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    projection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projections.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    initial_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(6, 4), nullable=False)  # Interest rate %
    term: Mapped[int] = mapped_column(Integer, nullable=False)  # Years
    amortization: Mapped[int] = mapped_column(Integer, nullable=False)  # Months
    start_year: Mapped[int] = mapped_column(Integer, nullable=False)
    end_year: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    projection = relationship("Projection", back_populates="loans")
