import uuid

from pydantic import BaseModel


class StatementStructureUpsert(BaseModel):
    structure: list[dict]  # Flexible JSON array of row objects


class StatementStructureResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    statement_type: str
    structure: list[dict]

    model_config = {"from_attributes": True}


class StatementStructureListResponse(BaseModel):
    structures: list[StatementStructureResponse]
