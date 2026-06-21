import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CoaVersion(Base):
    """Audit history of the global chart of accounts (standard_link_codes).

    One row per seed/publish run. The current version is ``max(version)``.
    Companies are stamped with the version they were created under
    (``Company.coa_version``) so chart-cohort drift between companies created
    at different times is traceable.
    """

    __tablename__ = "coa_versions"
    __table_args__ = (UniqueConstraint("version", name="uq_coa_versions_version"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False, default="MO.xlsx")
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    code_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tombstoned_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
