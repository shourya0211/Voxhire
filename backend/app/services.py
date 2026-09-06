from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.hunar import callback_config, hunar
from app.messaging import compose_followup_message, send_twilio_message
from app.models import Candidate, Job, Outreach
from app.serialize import dumps


def _custom_data_for_agent(
    agent: dict[str, Any],
    *,
    company: str,
    job_role: str,
    location: str,
    candidate_headline: str,
    screening_focus: str,
) -> dict[str, str]:
    available = {
        "company": company,
        "job_role": job_role,
        "location": location or "India",
        "candidate_headline": candidate_headline or job_role,
        "screening_focus": screening_focus,
    }
    required = agent.get("custom_variables") or []
    payload: dict[str, str] = {}
    for key in required:
        payload[key] = available.get(key, "")
    return payload


def persist_candidate(db: Session, data: dict[str, Any], job_id: int | None = None) -> Candidate:
    candidate = Candidate(
        job_id=job_id if job_id is not None else data.get("job_id"),
        source=data.get("source") or "manual",
        name=data["name"],
        phone=data.get("phone") or "",
        email=data.get("email") or "",
        title=data.get("title") or "",
        company=data.get("company") or "",
        location=data.get("location") or "",
        headline=data.get("headline") or "",
        skills=dumps(data.get("skills") or []),
        profile_url=data.get("profile_url") or "",
        notes=data.get("notes") or "",
        match_score=int(data.get("match_score") or 0),
        raw_json=dumps(data),
    )
    db.add(candidate)
    db.flush()
    return candidate


def place_voice_call(
    db: Session,
    *,
    candidate: Candidate,
    agent_id: str,
    company: str,
    job_role: str,
    location: str,
    screening_focus: str,
    purpose: str,
    timezone: str = "Asia/Kolkata",
    from_phone_number: str | None = None,
    retry_on_missed: bool = True,
) -> Outreach:
    if not candidate.phone.strip():
        raise HTTPException(status_code=400, detail=f"{candidate.name} is missing a phone number in E.164 format.")

    client = hunar()
    agent = client.get_agent(agent_id)
    custom_data = _custom_data_for_agent(
        agent,
        company=company,
        job_role=job_role,
        location=location,
        candidate_headline=candidate.headline or candidate.title or job_role,
        screening_focus=screening_focus,
    )
    request_id = f"vx-{purpose}-{uuid.uuid4().hex[:12]}"
    payload: dict[str, Any] = {
        "agent_id": agent_id,
        "callee_name": candidate.name,
        "mobile_number": candidate.phone.strip(),
        "custom_data": custom_data,
        "request_id": request_id,
        "timezone": timezone,
        # Org floor is earliest 08:00 IST; wider than that is rejected without a owned from number.
        "guardrails": {
            "allowed_days": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "earliest_call_time": "08:00",
            "last_call_time": "21:00",
        },
    }
    if from_phone_number:
        payload["from_phone_number"] = from_phone_number
    if retry_on_missed:
        payload["retry_config"] = {"max_retry_count": 1, "retry_interval_hours": 3}
    callbacks = callback_config()
    if callbacks:
        payload["callback_config"] = callbacks

    created = client.create_call(payload)
    row = Outreach(
        candidate_id=candidate.id,
        job_id=candidate.job_id,
        channel="voice",
        agent_id=agent_id,
        hunar_call_id=str(created.get("id") or ""),
        request_id=str(created.get("request_id") or request_id),
        status=str(created.get("status") or "NOT_STARTED"),
        lifecycle_status=str(created.get("lifecycle_status") or ""),
        purpose=purpose,
        custom_data=dumps(custom_data),
    )
    db.add(row)
    db.flush()
    return row


def queue_text_followup(
    db: Session,
    *,
    candidate: Candidate,
    channel: str,
    company: str,
    job_role: str,
    location: str,
    purpose: str,
) -> Outreach:
    body = compose_followup_message(
        channel=channel,
        name=candidate.name,
        company=company,
        job_role=job_role,
        location=location,
    )
    sent, info = send_twilio_message(channel=channel, to_number=candidate.phone, body=body)
    row = Outreach(
        candidate_id=candidate.id,
        job_id=candidate.job_id,
        channel=channel,
        purpose=purpose,
        status="SENT" if sent else "QUEUED",
        message_body=body,
        summary=info,
    )
    db.add(row)
    db.flush()
    return row


def sync_hunar_call(db: Session, row: Outreach) -> Outreach:
    if not row.hunar_call_id:
        return row
    try:
        remote = hunar().get_call(row.hunar_call_id)
    except Exception:
        return row
    if remote.get("status"):
        row.status = str(remote["status"])
    if remote.get("lifecycle_status"):
        row.lifecycle_status = str(remote["lifecycle_status"])
    if remote.get("recording_url"):
        row.recording_url = str(remote["recording_url"])
    if remote.get("result"):
        row.result_json = dumps(remote["result"])
        if isinstance(remote["result"], dict):
            row.summary = str(
                remote["result"].get("summary")
                or remote["result"].get("recommendation")
                or remote["result"].get("interested")
                or row.summary
            )
    db.add(row)
    return row


def dashboard_stats(rows: list[Outreach]) -> dict[str, Any]:
    total = len(rows)
    completed = sum(1 for row in rows if row.status == "COMPLETED")
    interested = 0
    for row in rows:
        result = {}
        try:
            import json

            result = json.loads(row.result_json or "{}")
        except json.JSONDecodeError:
            result = {}
        flag = str(result.get("interested") or "").lower()
        if flag in {"yes", "true", "interested"}:
            interested += 1
    return {
        "total": total,
        "completed": completed,
        "in_flight": sum(
            1
            for row in rows
            if row.channel == "voice" and row.status in {"NOT_STARTED", "SCHEDULED", "INITIATED", "RINGING", "IN_PROGRESS"}
        ),
        "interested": interested,
        "queued_messages": sum(1 for row in rows if row.channel in {"whatsapp", "sms"}),
    }


def ensure_job(db: Session, *, title: str, company: str, location: str, description: str, parsed: dict[str, Any]) -> Job:
    job = Job(
        title=title or parsed.get("title") or "Open role",
        company=company,
        location=location or parsed.get("location") or "",
        description=description,
        parsed_json=dumps(parsed),
    )
    db.add(job)
    db.flush()
    return job
