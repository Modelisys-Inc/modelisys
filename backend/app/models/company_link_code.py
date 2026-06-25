import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CompanyLinkCode(Base):
    """Per-company custom (tenant-local) link codes.

    The overlay on top of the global ``standard_link_codes`` registry: when an
    accounting-complex client needs a code that does not exist in the shared
    chart (from MO.xlsx), it is created here and stays private to that company
    forever — unless a curator later promotes it into the global registry
    (``promoted_to_standard_code`` records that linkage).

    Mirrors :class:`StandardLinkCode` so the compute and projection paths can
    resolve a code's metadata uniformly whether it is global or tenant-local.
    A link code resolves against (global ∪ this company's overlay); custom codes
    are validated never to collide with a global code, so global always wins.
    """

    __tablename__ = "company_link_codes"
    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_company_link_codes_company_code"),
        Index("ix_company_link_codes_company_family", "company_id", "family"),
        Index("ix_company_link_codes_company_is_leaf", "company_id", "is_leaf"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    parent_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    family: Mapped[str] = mapped_column(String(10), nullable=False)  # "ACT", "EXP", "CMV", ...
    label_account: Mapped[str | None] = mapped_column(String(255), nullable=True)
    label_sub_account: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    account_sub_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    variable_or_fixed: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ft_category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ft_line_item: Mapped[str | None] = mapped_column(String(300), nullable=True)
    projections: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_leaf: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Curated promotion (Phase 4): a custom code is a promotion candidate until a
    # curator promotes it into the global registry or rejects it as company-specific.
    # "pending" | "promoted" | "rejected".
    promotion_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    # Set once this custom code has been adopted into the global registry under the
    # given standard code (either a newly created code or an existing one it maps to).
    promoted_to_standard_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    company = relationship("Company", back_populates="link_codes")

    @property
    def label(self) -> str:
        return self.label_sub_account or self.label_account or self.code
