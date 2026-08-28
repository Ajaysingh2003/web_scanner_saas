import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.api_auth import require_identity
from app.core.database import get_session
from app.core.secrets import encrypt_secret
from app.models import OtpSession, OtpSessionStatus
from app.schemas.auth_scans import OtpSessionRead, OtpSubmit
from app.core.responses import ApiResponse, success_response


router = APIRouter(prefix="/otp-sessions", tags=["otp-sessions"])


async def _owned(session_id: uuid.UUID, request: Request, session: AsyncSession) -> OtpSession:
    identity = require_identity(request)
    if not identity["user_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A user or project API credential is required")
    otp_session = await session.get(OtpSession, session_id)
    if not otp_session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "OTP session not found")
    if identity["project_id"] and uuid.UUID(identity["project_id"]) != otp_session.project_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Project API key cannot access this OTP session")
    if identity["user_id"] and uuid.UUID(identity["user_id"]) != await _project_owner(otp_session.project_id, session):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "OTP session is not owned by this account")
    return otp_session


async def _project_owner(project_id: uuid.UUID, session: AsyncSession) -> uuid.UUID:
    from app.models import Project
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project.owner_user_id


@router.get("/{session_id}", response_model=ApiResponse[OtpSessionRead])
async def get_otp_session(session_id: uuid.UUID, request: Request,
                          session: AsyncSession = Depends(get_session)):
    otp_session = await _owned(session_id, request, session)
    if otp_session.status == OtpSessionStatus.waiting_for_otp.value and otp_session.expires_at <= datetime.now(timezone.utc):
        otp_session.status = OtpSessionStatus.expired.value
        await session.commit()
    return success_response(request, "OTP session retrieved successfully", OtpSessionRead.model_validate(otp_session))


@router.post("/{session_id}/submit", response_model=ApiResponse[OtpSessionRead])
async def submit_otp(session_id: uuid.UUID, payload: OtpSubmit, request: Request,
                     session: AsyncSession = Depends(get_session)):
    otp_session = await _owned(session_id, request, session)
    now = datetime.now(timezone.utc)
    if otp_session.status != OtpSessionStatus.waiting_for_otp.value or otp_session.expires_at <= now:
        if otp_session.status == OtpSessionStatus.waiting_for_otp.value:
            otp_session.status = OtpSessionStatus.expired.value
            await session.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, "OTP session is no longer accepting submissions")
    otp_session.otp_encrypted = encrypt_secret(payload.otp)
    otp_session.status = OtpSessionStatus.submitted.value
    otp_session.submitted_at = now
    await session.commit()
    await session.refresh(otp_session)
    return success_response(request, "OTP submitted successfully", OtpSessionRead.model_validate(otp_session))
