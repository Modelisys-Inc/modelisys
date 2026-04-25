import base64
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator


_MAX_ATTACHMENTS = 5
_MAX_BYTES_PER_FILE = 4 * 1024 * 1024  # 4 MiB
_ALLOWED_MEDIA_PREFIXES = (
    "application/pdf",
    "image/",
    "application/vnd.openxmlformats-officedocument",
    "application/vnd.ms-excel",
    "application/msword",
    "application/vnd.ms-excel.sheet",
    "text/csv",
    "application/csv",
    "application/octet-stream",
    "text/plain",
)


class NoteAttachmentItem(BaseModel):
    """Pièce jointe encodée en base64 (fichier binaire)."""

    filename: str = Field(..., min_length=1, max_length=255)
    media_type: str = Field(..., min_length=1, max_length=120)
    data: str = Field(..., min_length=1, description="Contenu fichier encodé en base64")

    @field_validator("data")
    @classmethod
    def validate_base64_and_size(cls, v: str) -> str:
        try:
            raw = base64.b64decode(v, validate=True)
        except Exception as exc:
            raise ValueError("Pièce jointe : encodage base64 invalide") from exc
        if len(raw) > _MAX_BYTES_PER_FILE:
            raise ValueError(f"Fichier trop volumineux (max {_MAX_BYTES_PER_FILE // (1024 * 1024)} Mo)")
        return v

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, v: str) -> str:
        v_lower = v.lower().strip()
        if not any(v_lower.startswith(p) or v_lower == p.rstrip("/") for p in _ALLOWED_MEDIA_PREFIXES):
            raise ValueError("Type de fichier non autorisé pour la pièce jointe")
        return v


class NoteCreate(BaseModel):
    row_id: str = Field(..., min_length=1, max_length=100)
    row_label: str = Field(..., min_length=1, max_length=200)
    page: str = Field(..., min_length=1, max_length=100)
    period: str = Field(..., min_length=1, max_length=50)
    view: str = Field(..., min_length=1, max_length=50)
    current_amount: float | None = None
    prior_amount: float | None = None
    variation_percent: float | None = None
    variation_amount: float | None = None
    content: str = Field(..., min_length=1, max_length=10000)
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    attachments: list[NoteAttachmentItem] = Field(default_factory=list)
    reference_month: int | None = Field(default=None, ge=1, le=12)
    reference_year: int | None = Field(default=None, ge=1990, le=2100)

    @model_validator(mode="after")
    def reference_pair_create(self) -> "NoteCreate":
        rm, ry = self.reference_month, self.reference_year
        if (rm is None) ^ (ry is None):
            raise ValueError("Mois et année de référence doivent être fournis ensemble")
        return self

    @model_validator(mode="after")
    def limit_attachment_count(self) -> "NoteCreate":
        if len(self.attachments) > _MAX_ATTACHMENTS:
            raise ValueError(f"Maximum {_MAX_ATTACHMENTS} pièces jointes")
        return self


class NoteUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=10000)
    current_amount: float | None = None
    prior_amount: float | None = None
    variation_percent: float | None = None
    variation_amount: float | None = None
    attachments: list[NoteAttachmentItem] | None = None
    reference_month: int | None = Field(default=None, ge=1, le=12)
    reference_year: int | None = Field(default=None, ge=1990, le=2100)

    @model_validator(mode="after")
    def reference_pair_update(self) -> "NoteUpdate":
        rm, ry = self.reference_month, self.reference_year
        if (rm is None) ^ (ry is None):
            raise ValueError("Mois et année de référence doivent être fournis ensemble")
        return self

    @model_validator(mode="after")
    def limit_attachment_count(self) -> "NoteUpdate":
        if self.attachments is not None and len(self.attachments) > _MAX_ATTACHMENTS:
            raise ValueError(f"Maximum {_MAX_ATTACHMENTS} pièces jointes")
        return self


class NoteAttachmentResponse(BaseModel):
    filename: str
    media_type: str
    data: str

    model_config = {"from_attributes": True}


class NoteResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID | None = None
    division_id: uuid.UUID | None = None
    sub_division_id: uuid.UUID | None = None
    row_id: str
    row_label: str
    page: str
    period: str
    view: str
    current_amount: float | None = None
    prior_amount: float | None = None
    variation_percent: float | None = None
    variation_amount: float | None = None
    content: str
    attachments: list[NoteAttachmentResponse] = Field(default_factory=list)
    reference_month: int | None = None
    reference_year: int | None = None
    fiscal_year: int | None = Field(
        default=None,
        description="Exercice financier (année de clôture selon la fin d’exercice de la société)",
    )
    created_by_id: uuid.UUID
    created_by_name: str = Field(..., description="Nom complet de l’utilisateur auteur")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("attachments", mode="before")
    @classmethod
    def coerce_attachments(cls, v: object) -> object:
        if v is None:
            return []
        return v


class NoteListResponse(BaseModel):
    notes: list[NoteResponse]
    total: int | None = None
    limit: int | None = None
    offset: int | None = None
    has_more: bool | None = None
