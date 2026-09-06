from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.agents import hiring_agent_payload, outreach_agent_payload
from app.config import get_settings
from app.database import get_db
from app.hunar import hunar
from app.models import Candidate, Job, Outreach, WebhookEvent
from app.people.search import search_people
from app.schemas import (
    AgentCreateRequest,
    CallCreateRequest,
    CandidateIn,
    IntegrationStatus,
    JobCreate,
    ReachoutRequest,
    ScreenRequest,
    SearchRequest,
)
from app.security import verify_hunar_webhook_signature
from app.serialize import apply_hunar_event, candidate_to_dict, outreach_to_dict
from app.services import (
    dashboard_stats,
    ensure_job,
    persist_candidate,
    place_voice_call,
    queue_text_followup,
    sync_hunar_call,
)

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/integrations", response_model=IntegrationStatus)
def integrations() -> IntegrationStatus:
    settings = get_settings()
    if settings.pdl_configured:
        provider = "pdl"
    elif settings.apollo_configured:
        provider = "apollo"
    else:
        provider = "demo"
    return IntegrationStatus(
        hunar=settings.hunar_configured,
        people_data_labs=settings.pdl_configured,
        apollo=settings.apollo_configured,
        twilio_sms=settings.twilio_configured,
        twilio_whatsapp=settings.whatsapp_configured,
        webhooks=bool(settings.callback_base_url),
        people_search_provider=provider,
    )


@router.get("/agents")
def list_agents() -> Any:
    return hunar().list_agents()


@router.get("/agents/{agent_id}")
def get_agent(agent_id: str) -> Any:
    return hunar().get_agent(agent_id)


@router.post("/agents")
def create_agent(body: AgentCreateRequest) -> Any:
    if body.purpose == "outreach":
        payload = outreach_agent_payload(
            name=body.name,
            language=body.language,
            voice_persona=body.voice_persona,
            persona_name=body.persona_name,
            company=body.company,
        )
    else:
        payload = hiring_agent_payload(
            name=body.name,
            language=body.language,
            voice_persona=body.voice_persona,
            persona_name=body.persona_name,
            company=body.company,
        )
    if body.agent_prompt:
        payload["agent_prompt"] = body.agent_prompt
    if body.objective:
        payload["objective"] = body.objective
    if body.introduction:
        payload["introduction"] = body.introduction
    if body.result_prompt:
        payload["result_prompt"] = body.result_prompt
    if body.result_schema:
        payload["result_schema"] = body.result_schema
    return hunar().create_agent(payload)


@router.get("/numbers")
def list_numbers() -> Any:
    return hunar().list_numbers()


@router.get("/jobs")
def list_jobs(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    jobs = db.query(Job).order_by(Job.id.desc()).all()
    return [
        {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description,
            "parsed": json.loads(job.parsed_json or "{}"),
            "created_at": job.created_at,
        }
        for job in jobs
    ]


@router.post("/jobs")
def create_job(body: JobCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    _, parsed, _ = search_people(body.description, company=body.company, location=body.location, title=body.title, size=1)
    job = ensure_job(
        db,
        title=body.title or parsed["title"],
        company=body.company,
        location=body.location or parsed["location"],
        description=body.description,
        parsed=parsed,
    )
    db.commit()
    return {"id": job.id, "title": job.title, "parsed": parsed}


@router.get("/candidates")
def list_candidates(job_id: int | None = None, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    query = db.query(Candidate)
    if job_id:
        query = query.filter(Candidate.job_id == job_id)
    return [candidate_to_dict(item) for item in query.order_by(Candidate.id.desc()).all()]


@router.post("/candidates")
def add_candidate(body: CandidateIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    candidate = persist_candidate(db, body.model_dump())
    db.commit()
    db.refresh(candidate)
    return candidate_to_dict(candidate)


@router.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)) -> dict[str, bool]:
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.query(Outreach).filter(Outreach.candidate_id == candidate_id).delete()
    db.delete(candidate)
    db.commit()
    return {"ok": True}


@router.post("/search")
def search(body: SearchRequest) -> dict[str, Any]:
    provider, parsed, results = search_people(
        body.job_description,
        company=body.company,
        location=body.location,
        title=body.title,
        size=body.size,
        require_phone=body.require_phone,
    )
    return {"provider": provider, "job": parsed, "results": results}


@router.post("/hiring/screen")
def screen(body: ScreenRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    created: list[dict[str, Any]] = []
    for candidate_id in body.candidate_ids:
        candidate = db.get(Candidate, candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")
        row = place_voice_call(
            db,
            candidate=candidate,
            agent_id=body.agent_id,
            company=body.company,
            job_role=body.job_role,
            location=body.location,
            screening_focus=body.screening_focus,
            purpose="hiring",
            timezone=body.timezone,
            from_phone_number=body.from_phone_number,
            retry_on_missed=body.retry_on_missed,
        )
        created.append(outreach_to_dict(row))
        if body.whatsapp_fallback:
            queue_text_followup(
                db,
                candidate=candidate,
                channel="whatsapp",
                company=body.company,
                job_role=body.job_role,
                location=body.location,
                purpose="hiring",
            )
    db.commit()
    return {"calls": created}


@router.post("/search/reachout")
def reachout(body: ReachoutRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    _, parsed, _ = search_people(
        body.job_description,
        company=body.company,
        location=body.location,
        title=body.job_role,
        size=1,
    )
    job = None
    if body.save_job:
        job = ensure_job(
            db,
            title=body.job_role or parsed["title"],
            company=body.company,
            location=body.location or parsed["location"],
            description=body.job_description,
            parsed=parsed,
        )
    created: list[dict[str, Any]] = []
    for item in body.candidates:
        payload = item.model_dump()
        payload["source"] = payload.get("source") or "search"
        candidate = persist_candidate(db, payload, job_id=job.id if job else None)
        if "voice" in body.channels:
            row = place_voice_call(
                db,
                candidate=candidate,
                agent_id=body.agent_id,
                company=body.company,
                job_role=body.job_role,
                location=body.location,
                screening_focus=body.screening_focus,
                purpose="outreach",
                timezone=body.timezone,
                from_phone_number=body.from_phone_number,
            )
            created.append(outreach_to_dict(row))
        for channel in body.channels:
            if channel in {"whatsapp", "sms"}:
                row = queue_text_followup(
                    db,
                    candidate=candidate,
                    channel=channel,
                    company=body.company,
                    job_role=body.job_role,
                    location=body.location,
                    purpose="outreach",
                )
                created.append(outreach_to_dict(row))
    db.commit()
    return {"job_id": job.id if job else None, "outreach": created}


@router.post("/calls")
def create_call(body: CallCreateRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    if body.candidate_id:
        candidate = db.get(Candidate, body.candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
    else:
        candidate = persist_candidate(
            db,
            {"name": body.callee_name, "phone": body.mobile_number, "source": "manual"},
            job_id=body.job_id,
        )
    row = place_voice_call(
        db,
        candidate=candidate,
        agent_id=body.agent_id,
        company=str(body.custom_data.get("company") or "VoxHire"),
        job_role=str(body.custom_data.get("job_role") or "open role"),
        location=str(body.custom_data.get("location") or ""),
        screening_focus=str(body.custom_data.get("screening_focus") or "Screen the candidate."),
        purpose=body.purpose,
        timezone=body.timezone,
        from_phone_number=body.from_phone_number,
    )
    if body.whatsapp_fallback:
        queue_text_followup(
            db,
            candidate=candidate,
            channel="whatsapp",
            company=str(body.custom_data.get("company") or "VoxHire"),
            job_role=str(body.custom_data.get("job_role") or "open role"),
            location=str(body.custom_data.get("location") or ""),
            purpose=body.purpose,
        )
    db.commit()
    db.refresh(row)
    return outreach_to_dict(row)


@router.get("/calls")
def list_calls(
    purpose: str | None = None,
    sync: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    query = db.query(Outreach)
    if purpose:
        query = query.filter(Outreach.purpose == purpose)
    rows = query.order_by(Outreach.id.desc()).all()
    if sync:
        for row in rows:
            if (
                row.channel == "voice"
                and row.status not in {"COMPLETED", "FAILED", "CANCELLED"}
            ):
                sync_hunar_call(db, row)
        db.commit()
        rows = query.order_by(Outreach.id.desc()).all()
    return {"stats": dashboard_stats(rows), "results": [outreach_to_dict(row) for row in rows]}


@router.get("/calls/{call_id}")
def get_call(call_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(Outreach, call_id)
    if not row:
        raise HTTPException(status_code=404, detail="Call not found")
    if row.hunar_call_id and row.status != "CANCELLED":
        sync_hunar_call(db, row)
        db.commit()
        db.refresh(row)
    return outreach_to_dict(row)


@router.post("/calls/{call_id}/cancel")
def cancel_call(call_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(Outreach, call_id)
    if not row:
        raise HTTPException(status_code=404, detail="Call not found")
    if row.channel != "voice" or not row.hunar_call_id:
        row.status = "CANCELLED"
        row.lifecycle_status = "CANCELLED"
        db.commit()
        db.refresh(row)
        return outreach_to_dict(row)
    remote_ok = False
    try:
        hunar().cancel_call(row.hunar_call_id)
        remote_ok = True
        row.error = ""
    except Exception as exc:
        row.error = f"Remote cancel unavailable: {exc}"
    row.status = "CANCELLED"
    row.lifecycle_status = "CANCELLED"
    db.commit()
    db.refresh(row)
    out = outreach_to_dict(row)
    out["remote_cancelled"] = remote_ok
    return out


@router.get("/hunar/calls")
def hunar_calls(status: str | None = None, page: int = 1, page_size: int = 20) -> Any:
    return hunar().list_calls(status=status, page=page, page_size=page_size)


@router.post("/webhooks/hunar")
async def hunar_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    raw = await request.body()
    settings = get_settings()
    signature = request.headers.get("X-Hunar-Signature")
    timestamp = request.headers.get("X-Hunar-Timestamp")
    if signature:
        ok = verify_hunar_webhook_signature(
            signature_header=signature,
            timestamp_header=timestamp,
            request_body=raw,
            trusted_api_keys=[settings.hunar_api_key],
        )
        if not ok:
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc

    event = WebhookEvent(
        event_type=str(payload.get("event_type") or ""),
        call_id=str(payload.get("call_id") or ""),
        payload=json.dumps(payload),
    )
    db.add(event)
    call_id = str(payload.get("call_id") or "")
    if call_id:
        row = db.query(Outreach).filter(Outreach.hunar_call_id == call_id).first()
        if row:
            apply_hunar_event(row, payload)
    db.commit()
    return {"ok": True, "event_type": payload.get("event_type")}
