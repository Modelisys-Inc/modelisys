import uuid
from datetime import datetime

from sqlalchemy import Boolean, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    fiscal_year_end: Mapped[str] = mapped_column(String(5), nullable=False, default="12-31")  # MM-DD
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="CAD")
    is_cumulative_tb: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="companies")
    divisions = relationship("Division", back_populates="company", cascade="all, delete-orphan")
    chart_of_accounts = relationship("ChartOfAccount", back_populates="company", cascade="all, delete-orphan")
    trial_balance_entries = relationship("TrialBalanceEntry", back_populates="company", cascade="all, delete-orphan")
    account_mappings = relationship("AccountMapping", back_populates="company", foreign_keys="AccountMapping.company_id", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="company", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="company", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="company", cascade="all, delete-orphan")
    statement_structures = relationship("CompanyStatementStructure", back_populates="company", cascade="all, delete-orphan")


class Division(Base):
    __tablename__ = "divisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    company = relationship("Company", back_populates="divisions")
    sub_divisions = relationship("SubDivision", back_populates="division", cascade="all, delete-orphan")


class SubDivision(Base):
    __tablename__ = "sub_divisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    division_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    division = relationship("Division", back_populates="sub_divisions")
