import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FinancialStatementMapping(Base):
    """Organization-level financial statement structure definitions.
    Stores the hierarchical layout of postes/categories for each statement type
    (bilan, resultats, capex, baiia). The structure is stored as JSON since it's
    a deeply nested tree that varies per organization."""
    __tablename__ = "financial_statement_mappings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    mapping_type: Mapped[str] = mapped_column(String(30), nullable=False)  # bilan, resultats, capex, baiia
    structure: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)  # Array of Category/Poste objects
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="financial_statement_mappings")


class CompanyStatementStructure(Base):
    """Per-company overrides for income statement and balance sheet row structure.
    Stores the customized row layout (which rows are visible, order, hierarchy)."""
    __tablename__ = "company_statement_structures"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    statement_type: Mapped[str] = mapped_column(String(30), nullable=False)  # income-statement, balance-sheet
    structure: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)  # Array of row definition objects
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="statement_structures")
