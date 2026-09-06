from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.people.parse import parse_job_description, search_demo_pool


def _pdl_query(parsed: dict[str, Any], size: int) -> dict[str, Any]:
    must: list[dict[str, Any]] = []
    if parsed.get("title"):
        must.append({"match": {"job_title": parsed["title"]}})
    if parsed.get("location"):
        loc = parsed["location"].lower()
        if loc not in {"remote"}:
            must.append({"match": {"location_name": loc}})
    for skill in parsed.get("skills", [])[:5]:
        must.append({"match": {"skills": skill}})
    if not must:
        must.append({"exists": {"field": "full_name"}})
    return {"size": size, "query": {"bool": {"must": must}}}


def search_pdl(parsed: dict[str, Any], size: int) -> list[dict[str, Any]]:
    settings = get_settings()
    headers = {"X-Api-Key": settings.pdl_api_key, "Content-Type": "application/json"}
    with httpx.Client(timeout=25.0) as client:
        response = client.post(
            "https://api.peopledatalabs.com/v5/person/search",
            headers=headers,
            json=_pdl_query(parsed, size),
        )
    response.raise_for_status()
    payload = response.json()
    hits: list[dict[str, Any]] = []
    for record in payload.get("data", []):
        phones = record.get("phone_numbers") or []
        emails = record.get("emails") or []
        skills = [item.get("skill") if isinstance(item, dict) else str(item) for item in (record.get("skills") or [])]
        hits.append(
            {
                "name": record.get("full_name") or f"{record.get('first_name', '')} {record.get('last_name', '')}".strip(),
                "phone": phones[0] if phones else "",
                "email": (emails[0].get("address") if emails and isinstance(emails[0], dict) else (emails[0] if emails else "")),
                "title": record.get("job_title") or "",
                "company": record.get("job_company_name") or "",
                "location": record.get("location_name") or "",
                "headline": record.get("job_summary") or record.get("job_title") or "",
                "skills": [str(skill) for skill in skills[:8] if skill],
                "profile_url": record.get("linkedin_url") or "",
                "match_score": 80,
                "source": "pdl",
                "why": "People Data Labs person search",
            }
        )
    return hits


def search_apollo(parsed: dict[str, Any], size: int) -> list[dict[str, Any]]:
    settings = get_settings()
    headers = {"X-Api-Key": settings.apollo_api_key, "Content-Type": "application/json"}
    body = {
        "q_keywords": parsed.get("title") or "",
        "person_locations": [parsed["location"]] if parsed.get("location") else [],
        "page": 1,
        "per_page": size,
    }
    with httpx.Client(timeout=25.0) as client:
        response = client.post(
            "https://api.apollo.io/api/v1/mixed_people/search",
            headers=headers,
            json=body,
        )
    response.raise_for_status()
    payload = response.json()
    hits: list[dict[str, Any]] = []
    for record in payload.get("people", []):
        hits.append(
            {
                "name": record.get("name") or f"{record.get('first_name', '')} {record.get('last_name', '')}".strip(),
                "phone": ((record.get("phone_numbers") or [{}])[0] or {}).get("sanitized_number", ""),
                "email": record.get("email") or "",
                "title": record.get("title") or "",
                "company": (record.get("organization") or {}).get("name", ""),
                "location": ", ".join(filter(None, [record.get("city"), record.get("state"), record.get("country")])),
                "headline": record.get("headline") or record.get("title") or "",
                "skills": [],
                "profile_url": record.get("linkedin_url") or "",
                "match_score": 78,
                "source": "apollo",
                "why": "Apollo.io people search",
            }
        )
    return hits


def search_people(
    job_description: str,
    *,
    company: str = "VoxHire",
    location: str = "",
    title: str = "",
    size: int = 12,
    require_phone: bool = False,
) -> tuple[str, dict[str, Any], list[dict[str, Any]]]:
    parsed = parse_job_description(job_description, title=title, location=location, company=company)
    settings = get_settings()
    provider = "demo"
    results: list[dict[str, Any]] = []

    if settings.pdl_configured:
        try:
            results = search_pdl(parsed, size)
            provider = "pdl"
        except Exception:
            results = []
    if not results and settings.apollo_configured:
        try:
            results = search_apollo(parsed, size)
            provider = "apollo"
        except Exception:
            results = []
    if not results:
        results = search_demo_pool(parsed, size)
        provider = "demo"

    if require_phone:
        results = [item for item in results if item.get("phone")]
    return provider, parsed, results
