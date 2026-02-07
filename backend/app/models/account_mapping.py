import uuid
from datetime import datetime

from sqlalchemy import Index, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AccountMapping(Base):
    """Per-company GL account mapping to financial statement lines, cost types, etc."""
    __tablename__ = "account_mappings"
    __table_args__ = (
        Index("ix_account_mappings_company_link_code", "company_id", "link_code"),
        Index("ix_account_mappings_company_account_number", "company_id", "account_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    account_number: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    link_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    summary_ef: Mapped[str | None] = mapped_column(String(50), nullable=True)  # État Financier summary code
    detail_ef: Mapped[str | None] = mapped_column(String(50), nullable=True)  # État Financier detail code
    divisions: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sub_divisions: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fdrhc: Mapped[bool] = mapped_column(Boolean, default=False)  # Fonds de roulement hors capital
    interests: Mapped[bool] = mapped_column(Boolean, default=False)
    amortization: Mapped[bool] = mapped_column(Boolean, default=False)
    variable_costs: Mapped[bool] = mapped_column(Boolean, default=False)
    fixed_costs: Mapped[bool] = mapped_column(Boolean, default=False)
    product: Mapped[str | None] = mapped_column(String(255), nullable=True)
    interco_company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="account_mappings", foreign_keys=[company_id])
    interco_company = relationship("Company", foreign_keys=[interco_company_id])


class Product(Base):
    """Per-company product list for margin analysis."""
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int | None] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    company = relationship("Company", back_populates="products")
