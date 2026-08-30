import uuid
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, Field


class CompetitorInput(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    url: AnyHttpUrl


class CompetitorRead(BaseModel):
    id: uuid.UUID
    label: str
    url: str
    score: float | None
    status: str
    last_scanned_at: str | None


class CompetitorUpdate(BaseModel):
    competitors: list[CompetitorInput] = Field(min_length=1, max_length=3)


class RoiInput(BaseModel):
    monthly_sessions: int = Field(ge=1, le=100_000_000)
    average_order_value: float = Field(gt=0, le=10_000_000)
    conversion_rate: float = Field(gt=0, le=100)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    lcp_delay_seconds: float = Field(default=1.2, ge=0, le=30)


class RoiRead(BaseModel):
    monthly_sessions: int
    average_order_value: float
    conversion_rate: float
    currency: str
    lcp_delay_seconds: float
    estimated_conversion_loss_percent: float
    estimated_monthly_revenue_at_risk: float
    methodology: Literal["directional_estimate"] = "directional_estimate"
