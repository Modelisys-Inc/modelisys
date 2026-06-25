import uuid
from datetime import datetime

from sqlalchemy import Index, String, Integer, Numeric, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AccountGroup(Base):
    """Top-level grouping: e.g. 'Actif - Court terme', 'Passif - Court terme'.
    Scoped per organization so all companies share the same structure."""
    __tablename__ = "account_groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # Actif, Passif, Capitaux propres, Revenus, Charges
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="account_groups")
    account_categories = relationship("AccountCategory", back_populates="account_group", cascade="all, delete-orphan")


class AccountCategory(Base):
    """Sub-grouping within an account group: e.g. 'Encaisse', 'Comptes clients'."""
    __tablename__ = "account_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("account_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    account_group = relationship("AccountGroup", back_populates="account_categories")
    chart_of_accounts = relationship("ChartOfAccount", back_populates="account_category")


class ChartOfAccount(Base):
    """Individual GL account mapped to a category. Per-company."""
    __tablename__ = "chart_of_accounts"
    __table_args__ = (
        UniqueConstraint("company_id", "account_number", name="uq_chart_of_accounts_company_account_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    account_category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("account_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    account_number: Mapped[str] = mapped_column(String(20), nullable=False)
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    company = relationship("Company", back_populates="chart_of_accounts")
    account_category = relationship("AccountCategory", back_populates="chart_of_accounts")
    trial_balance_entries = relationship("TrialBalanceEntry", back_populates="account", cascade="all, delete-orphan")
    budget_entries = relationship("BudgetEntry", back_populates="account")


class TrialBalanceEntry(Base):
    """Monthly amount for a GL account. Core financial data.

    Range-partitioned by ``fiscal_year`` in PostgreSQL (see migration 015), so
    ``fiscal_year`` is part of the primary key (Postgres requires the partition
    key in the PK and every unique constraint). On SQLite (tests) this is just a
    composite-PK table.
    """
    __tablename__ = "trial_balance_entries"
    __table_args__ = (
        Index("ix_trial_balance_entries_company_fiscal_year", "company_id", "fiscal_year"),
        Index("ix_trial_balance_entries_company_fiscal_year_month", "company_id", "fiscal_year", "month"),
        UniqueConstraint("company_id", "account_id", "fiscal_year", "month", name="uq_trial_balance_entries_company_account_year_month"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fiscal_year: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chart_of_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-12
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)

    # Relationships
    company = relationship("Company", back_populates="trial_balance_entries")
    account = relationship("ChartOfAccount", back_populates="trial_balance_entries")


class AccountAnnualBalance(Base):
    """Pre-aggregated annual total per GL account (rollup of trial_balance_entries).

    One row per (company, account, fiscal_year) holding the sum of the monthly
    amounts, so annual dashboards avoid scanning 12 monthly rows per account.
    Maintained by ``app/services/tb_rollup.py`` after every TB write; it is a
    derived cache and never the source of truth.
    """
    __tablename__ = "account_annual_balances"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "account_id", "fiscal_year",
            name="uq_account_annual_balances_company_account_year",
        ),
        Index("ix_account_annual_balances_company_fiscal_year", "company_id", "fiscal_year"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chart_of_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    month_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
