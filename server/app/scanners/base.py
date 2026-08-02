from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from app.models.scan import Severity


@dataclass(slots=True)
class FindingResult:
    severity: Severity
    title: str
    description: str
    evidence: dict[str, Any] = field(default_factory=dict)
    remediation: str = ""
    confidence: float = 1.0
    raw_data: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ScanContext:
    http: Any
    dns: Any = None
    ssl_error: str | None = None
    supabase: dict[str, str] | None = None
    security_test: dict[str, object] | None = None
    security_test_runtime: dict[str, object] | None = None


class BaseScanner(ABC):
    name: str
    category: str

    @abstractmethod
    async def scan(self, target: str, context: ScanContext) -> list[FindingResult]:
        raise NotImplementedError
