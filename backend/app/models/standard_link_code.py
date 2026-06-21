import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StandardLinkCode(Base):
    """Global standardized chart of accounts codes (from MO.xlsx).

    Leaf codes (is_leaf=True) are the only ones assignable to GL account mappings.
    Parent codes exist for display/grouping only.
    """

    __tablename__ = "standard_link_codes"
    __table_args__ = (
        UniqueConstraint("code", name="uq_standard_link_codes_code"),
        Index("ix_standard_link_codes_family", "family"),
        Index("ix_standard_link_codes_is_leaf", "is_leaf"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    parent_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    family: Mapped[str] = mapped_column(String(10), nullable=False)  # "ACT", "EXP", "CMV", ...
    label_account: Mapped[str | None] = mapped_column(String(255), nullable=True)
    label_sub_account: Mapped[str | None] = mapped_column(String(255), nullable=True)
    account_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    account_sub_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    variable_or_fixed: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ft_category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    attached_link_codes: Mapped[list] = mapped_column(
        JSON().with_variant(JSONB(astext_type=Text()), "postgresql"),
        nullable=False,
        default=list,
        server_default="[]",
    )
    ft_line_item: Mapped[str | None] = mapped_column(String(300), nullable=True)
    projections: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_leaf: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def label(self) -> str:
        return self.label_sub_account or self.label_account or self.code
