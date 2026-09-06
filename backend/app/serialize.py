from __future__ import annotations

import json
from typing import Any

from app.models import Candidate, Outreach


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def loads(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def candidate_to_dict(candidate: Candidate) -> dict[str, Any]:
    return {
        "id": candidate.id,
        "job_id": candidate.job_id,
        "source": candidate.source,
        "name": candidate.name,
        "phone": candidate.phone,
        "email": candidate.email,
        "title": candidate.title,
        "company": candidate.company,
        "location": candidate.location,
        "headline": candidate.headline,
        "skills": loads(candidate.skills, []),
        "profile_url": candidate.profile_url,
        "notes": candidate.notes,
        "match_score": candidate.match_score,
        "created_at": candidate.created_at,
    }


def outreach_to_dict(row: Outreach) -> dict[str, Any]:
    return {
        "id": row.id,
        "candidate_id": row.candidate_id,
        "candidate_name": row.candidate.name if row.candidate else "",
        "phone": row.candidate.phone if row.candidate else "",
        "channel": row.channel,
        "purpose": row.purpose,
        "agent_id": row.agent_id,
        "hunar_call_id": row.hunar_call_id,
        "request_id": row.request_id,
        "status": row.status,
        "lifecycle_status": row.lifecycle_status,
        "result": loads(row.result_json, {}),
        "recording_url": row.recording_url,
        "summary": row.summary,
        "message_body": row.message_body,
        "error": row.error,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def apply_hunar_event(row: Outreach, payload: dict[str, Any]) -> None:
    event_type = payload.get("event_type") or ""
    if payload.get("status"):
        row.status = str(payload["status"])
    if payload.get("lifecycle_status"):
        row.lifecycle_status = str(payload["lifecycle_status"])
    if payload.get("recording_url"):
        row.recording_url = str(payload["recording_url"])
    if payload.get("result"):
        row.result_json = dumps(payload["result"])
        if isinstance(payload["result"], dict):
            row.summary = str(
                payload["result"].get("summary")
                or payload["result"].get("recommendation")
                or payload["result"].get("interested")
                or row.summary
            )
    if event_type == "call_recording_done" and payload.get("recording_url"):
        row.recording_url = str(payload["recording_url"])
    if event_type == "call_result_done" and payload.get("result"):
        row.result_json = dumps(payload["result"])
