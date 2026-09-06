from __future__ import annotations

import re
from typing import Any

from app.people.talent_pool import TALENT_POOL

SKILL_VOCAB = {
    "python",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "node.js",
    "java",
    "go",
    "golang",
    "rust",
    "kotlin",
    "swift",
    "sql",
    "postgresql",
    "postgres",
    "redis",
    "kafka",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "terraform",
    "fastapi",
    "django",
    "flask",
    "pytorch",
    "tensorflow",
    "llm",
    "nlp",
    "spark",
    "airflow",
    "dbt",
    "figma",
    "product",
    "sales",
    "recruiting",
    "hr",
    "payroll",
    "android",
    "ios",
    "react native",
    "graphql",
    "playwright",
    "cypress",
    "voice ai",
    "telephony",
    "twilio",
    "excel",
    "analytics",
    "fintech",
    "saas",
}

TITLE_HINTS = [
    "engineer",
    "developer",
    "manager",
    "designer",
    "scientist",
    "analyst",
    "recruiter",
    "specialist",
    "architect",
    "lead",
    "head",
    "director",
    "executive",
    "partner",
    "intern",
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def parse_job_description(text: str, title: str = "", location: str = "", company: str = "") -> dict[str, Any]:
    raw = _normalize(text)
    lowered = raw.lower()
    lines = [line.strip(" -•\t") for line in text.splitlines() if line.strip()]

    inferred_title = title.strip()
    if not inferred_title and lines:
        first = lines[0]
        if "—" in first:
            first = first.split("—", 1)[0].strip()
        if len(first) < 80:
            inferred_title = first

    cities = [
        "bengaluru",
        "bangalore",
        "hyderabad",
        "pune",
        "mumbai",
        "delhi",
        "gurugram",
        "gurgaon",
        "chennai",
        "noida",
        "kochi",
        "lucknow",
        "remote",
    ]
    inferred_location = location.strip()
    if not inferred_location:
        for city in cities:
            if city in lowered:
                inferred_location = city.title()
                break

    skills = sorted({skill for skill in SKILL_VOCAB if skill in lowered})
    years = None
    match = re.search(r"(\d+)\+?\s*(?:years|yrs)", lowered)
    if match:
        years = int(match.group(1))

    return {
        "title": inferred_title or "Open role",
        "company": company or "VoxHire",
        "location": inferred_location,
        "skills": skills,
        "years_experience": years,
        "description": raw,
    }


def _score(person: dict[str, Any], parsed: dict[str, Any]) -> tuple[int, str]:
    person_skills = {skill.lower() for skill in person.get("skills", [])}
    job_skills = {skill.lower() for skill in parsed.get("skills", [])}
    overlap = person_skills & job_skills
    title = (person.get("title") or "").lower()
    job_title = (parsed.get("title") or "").lower()
    loc_person = (person.get("location") or "").lower()
    loc_job = (parsed.get("location") or "").lower()

    score = 20
    reasons: list[str] = []
    if overlap:
        score += 12 * len(overlap)
        reasons.append("skills: " + ", ".join(sorted(overlap)[:4]))
    title_tokens = set(re.findall(r"[a-z]+", job_title)) - {"the", "and", "for", "with"}
    if title_tokens and any(token in title for token in title_tokens):
        score += 18
        reasons.append("title overlap")
    if loc_job and (loc_job in loc_person or loc_person in loc_job or loc_job == "remote"):
        score += 10
        reasons.append("location")
    if "senior" in job_title and "senior" in title:
        score += 6
    return min(score, 99), "; ".join(reasons) or "profile adjacency"


def search_demo_pool(parsed: dict[str, Any], size: int = 12) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for person in TALENT_POOL:
        score, why = _score(person, parsed)
        ranked.append(
            {
                **person,
                "phone": "",
                "match_score": score,
                "source": "demo",
                "why": why,
            }
        )
    ranked.sort(key=lambda item: item["match_score"], reverse=True)
    return ranked[:size]
