from datetime import datetime, timezone
from typing import Generic, TypeVar
from uuid import uuid4

from fastapi import Request
from pydantic import BaseModel


DataT = TypeVar("DataT")


class ResponseMeta(BaseModel):
    request_id: str
    timestamp: datetime
    total: int | None = None


class ApiResponse(BaseModel, Generic[DataT]):
    success: bool = True
    message: str
    data: DataT | None = None
    meta: ResponseMeta


def success_response(request: Request, message: str, data: DataT | None = None,
                     total: int | None = None) -> ApiResponse[DataT]:
    request_id = getattr(request.state, "request_id", None) or str(uuid4())
    return ApiResponse(
        message=message,
        data=data,
        meta=ResponseMeta(request_id=request_id, timestamp=datetime.now(timezone.utc), total=total),
    )
