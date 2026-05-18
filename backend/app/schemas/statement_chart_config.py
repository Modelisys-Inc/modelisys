"""Pydantic schemas for statement_chart_configs API.

The V2 series spec carried in `config_json` is a tree of variants
(single/sum/difference/ratio/derivedMargin). We validate the *shape*
of the top-level container here; nested specs are accepted as
arbitrary dicts and re-validated when the frontend reads them.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


StatementType = Literal["income-statement", "balance-sheet", "cash-flow"]


class ChartSeriesSpec(BaseModel):
    """Top-level series shape. Nested `spec` dict is opaque to the backend."""

    model_config = ConfigDict(extra="allow")

    id: str = Field(..., min_length=1, max_length=128)
    kind: Literal["bar", "line"]
    label: str = Field(..., min_length=0, max_length=200)
    spec: dict
    yAxis: Literal["left", "right"]
    valueFormat: Literal["currency", "ratio"]
    showOnChart: bool = True
    showInSidePanel: bool = True
    color: str | None = None
    stackGroup: str | None = None


class ChartConfigPayload(BaseModel):
    """Body of a V2 chart config stored in `config_json`."""

    model_config = ConfigDict(extra="allow")

    version: Literal[2] = 2
    chartTitle: str = Field(..., min_length=0, max_length=200)
    series: list[ChartSeriesSpec] = Field(default_factory=list)


class ChartSlotResponse(BaseModel):
    """One row returned by GET / PUT / POST."""

    chart_instance_id: str
    slot_index: int
    version: int
    config: ChartConfigPayload
    updated_by_user_email: str | None = None
    updated_at: datetime


class ChartSlotListResponse(BaseModel):
    slots: list[ChartSlotResponse]


class ChartSlotUpdateRequest(BaseModel):
    """Body of PUT — version is required for stale-write detection."""

    version: int = Field(..., ge=1)
    config: ChartConfigPayload


class ChartSlotConflictResponse(BaseModel):
    """Body returned with 409 Conflict on stale PUT."""

    detail: str = "stale_version"
    current_version: int
    current_config: ChartConfigPayload
    updated_by_user_email: str | None = None
    updated_at: datetime
