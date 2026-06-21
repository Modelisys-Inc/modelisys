import uuid
from datetime import datetime

from sqlalchemy import JSON, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # Superadmin-managed per-client feature toggles: {flag_key: bool} overrides on
    # top of the registry defaults (see app/services/feature_flags.py).
    feature_flags: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    memberships = relationship("UserOrganization", back_populates="organization", cascade="all, delete-orphan")
    companies = relationship("Company", back_populates="organization", cascade="all, delete-orphan")
    account_groups = relationship("AccountGroup", back_populates="organization", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="organization", cascade="all, delete-orphan")
    projections = relationship("Projection", back_populates="organization", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="organization", cascade="all, delete-orphan")
    financial_statement_mappings = relationship("FinancialStatementMapping", back_populates="organization", cascade="all, delete-orphan")
    exchange_rates = relationship("ExchangeRate", back_populates="organization", cascade="all, delete-orphan")
    business_risks = relationship("BusinessRisk", back_populates="organization", cascade="all, delete-orphan")
    forecast_configs = relationship("ForecastConfig", back_populates="organization", cascade="all, delete-orphan")
    ebitda_multiple_notes = relationship("EbitdaMultipleNote", back_populates="organization", cascade="all, delete-orphan")
