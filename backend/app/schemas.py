from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class IntegrationStatus(BaseModel):
    hunar: bool
    people_data_labs: bool
    apollo: bool
    twilio_sms: bool
    twilio_whatsapp: bool
    webhooks: bool
    people_search_provider: str


class AgentCreateRequest(BaseModel):
    name: str
    language: str = "ENGLISH"
    voice_persona: str = "NEHA"
    persona_name: str = "Asha"
    purpose: Literal["hiring", "outreach"] = "hiring"
    company: str = "VoxHire"
    agent_prompt: str | None = None
    objective: str | None = None
    introduction: str | None = None
    result_prompt: str | None = None
    result_schema: dict[str, Any] | None = None


class CandidateIn(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    title: str = ""
    company: str = ""
    location: str = ""
    headline: str = ""
    skills: list[str] = Field(default_factory=list)
    profile_url: str = ""
    notes: str = ""
    job_id: int | None = None
    source: str = "manual"


class CandidateOut(BaseModel):
    id: int
    job_id: int | None
    source: str
    name: str
    phone: str
    email: str
    title: str
    company: str
    location: str
    headline: str
    skills: list[str]
    profile_url: str
    notes: str
    match_score: int
    created_at: datetime | None = None


class JobCreate(BaseModel):
    title: str = ""
    company: str = "VoxHire"
    location: str = ""
    description: str


class JobOut(BaseModel):
    id: int
    title: str
    company: str
    location: str
    description: str
    parsed: dict[str, Any]
    created_at: datetime | None = None


class SearchRequest(BaseModel):
    job_description: str
    company: str = "VoxHire"
    location: str = ""
    title: str = ""
    size: int = 12
    require_phone: bool = False


class SearchHit(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    title: str = ""
    company: str = ""
    location: str = ""
    headline: str = ""
    skills: list[str] = Field(default_factory=list)
    profile_url: str = ""
    match_score: int = 0
    source: str = "demo"
    why: str = ""


class SearchResponse(BaseModel):
    provider: str
    job: dict[str, Any]
    results: list[SearchHit]


class ScreenRequest(BaseModel):
    agent_id: str
    candidate_ids: list[int]
    company: str
    job_role: str
    location: str = ""
    screening_focus: str = "Confirm interest, notice period, compensation, and joining timeline."
    timezone: str = "Asia/Kolkata"
    from_phone_number: str | None = None
    retry_on_missed: bool = True
    whatsapp_fallback: bool = True


class ReachoutRequest(BaseModel):
    agent_id: str
    candidates: list[CandidateIn]
    job_description: str
    company: str
    job_role: str
    location: str = ""
    screening_focus: str = "Gauge interest in the role and collect next-step availability."
    timezone: str = "Asia/Kolkata"
    from_phone_number: str | None = None
    channels: list[Literal["voice", "whatsapp", "sms"]] = Field(default_factory=lambda: ["voice"])
    save_job: bool = True


class CallOut(BaseModel):
    id: int
    candidate_id: int
    candidate_name: str
    phone: str
    channel: str
    purpose: str
    agent_id: str
    hunar_call_id: str
    request_id: str
    status: str
    lifecycle_status: str
    result: dict[str, Any]
    recording_url: str
    summary: str
    message_body: str
    error: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CallCreateRequest(BaseModel):
    agent_id: str
    callee_name: str
    mobile_number: str
    custom_data: dict[str, Any] = Field(default_factory=dict)
    from_phone_number: str | None = None
    timezone: str = "Asia/Kolkata"
    purpose: str = "hiring"
    candidate_id: int | None = None
    job_id: int | None = None
    whatsapp_fallback: bool = False
