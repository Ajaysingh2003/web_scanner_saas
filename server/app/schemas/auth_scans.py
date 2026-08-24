import uuid
from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, SecretStr, model_validator

from app.models.otp_session import OtpSessionStatus


AuthAction = Literal[
    "open_url", "fill", "click", "wait_for_otp", "fill_otp",
    "wait_for_selector", "assert_url_contains", "assert_text",
]
AuthFlowType = Literal[
    "login", "login_with_otp", "passwordless", "password_reset", "signup",
]


class AuthTestAccount(BaseModel):
    email: str | None = None
    phone: str | None = None
    username: str | None = None
    identifier: str | None = None
    password: SecretStr | None = None

    def has_identifier(self) -> bool:
        return any((self.email, self.phone, self.username, self.identifier))


class AuthFlowStep(BaseModel):
    action: AuthAction
    url: str | None = None
    selector: str | None = None
    value: str | None = None
    value_from: str | None = None
    prompt: str | None = None
    text: str | None = None


class AuthFlow(BaseModel):
    type: AuthFlowType
    steps: list[AuthFlowStep] = Field(min_length=1, max_length=40)


class RateLimitProbe(BaseModel):
    """A deliberately bounded failed-login probe for an owned test environment."""

    enabled: bool = False
    start_url: str = "/"
    identifier_selector: str | None = None
    identifier_from: Literal[
        "test_account.email", "test_account.phone", "test_account.username", "test_account.identifier"
    ] = "test_account.email"
    password_selector: str | None = None
    submit_selector: str | None = None
    wrong_password: SecretStr | None = None
    attempts: int = Field(default=5, ge=3, le=8)
    delay_ms: int = Field(default=500, ge=250, le=2_000)
    endpoint_path: str | None = None

    @model_validator(mode="after")
    def validate_probe(self):
        if self.enabled:
            required = {
                "identifier_selector": self.identifier_selector,
                "password_selector": self.password_selector,
                "submit_selector": self.submit_selector,
                "wrong_password": self.wrong_password,
            }
            missing = [name for name, value in required.items() if not value]
            if missing:
                raise ValueError(f"enabled rate_limit_probe requires: {', '.join(missing)}")
            if self.endpoint_path and not self.endpoint_path.startswith("/"):
                raise ValueError("endpoint_path must be same-origin and start with '/'")
        return self


class AuthenticationScanCreate(BaseModel):
    environment: Literal["production", "staging", "preview"] = "staging"
    authorized: bool = False
    production_confirmed: bool = False
    mode: Literal["active"] = "active"
    include_password_reset: bool = False
    webhook_url: AnyHttpUrl
    webhook_secret: SecretStr = Field(min_length=32)
    test_account: AuthTestAccount
    flow: AuthFlow
    rate_limit_probe: RateLimitProbe = Field(default_factory=RateLimitProbe)

    def validate_request(self) -> None:
        if not self.authorized:
            raise ValueError("authorized must be true for authentication testing")
        if self.environment == "production" and not self.production_confirmed:
            raise ValueError("production_confirmed must be true for production authentication testing")
        if not self.test_account.has_identifier():
            raise ValueError("test_account must include email, phone, username, or identifier")


class OtpSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    scan_id: uuid.UUID
    project_id: uuid.UUID
    status: OtpSessionStatus
    prompt: str
    expires_at: datetime
    created_at: datetime | None
    submitted_at: datetime | None


class OtpSubmit(BaseModel):
    otp: str = Field(min_length=4, max_length=12, pattern=r"^[A-Za-z0-9 -]+$")
