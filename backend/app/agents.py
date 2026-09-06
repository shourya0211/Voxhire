HIRING_RESULT_SCHEMA = {
    "interested": "",
    "notice_period": "",
    "current_compensation": "",
    "expected_compensation": "",
    "years_experience": "",
    "joining_timeline": "",
    "strengths": "",
    "concerns": "",
    "recommendation": "",
}

OUTREACH_RESULT_SCHEMA = {
    "interested": "",
    "fit_for_role": "",
    "current_situation": "",
    "preferred_next_step": "",
    "best_time_to_talk": "",
    "relocation_or_remote": "",
    "objections": "",
    "summary": "",
}


def hiring_agent_payload(
    *,
    name: str = "VoxHire Screening",
    language: str = "ENGLISH",
    voice_persona: str = "NEHA",
    persona_name: str = "Asha",
    company: str = "VoxHire",
) -> dict:
    return {
        "name": name,
        "language": language,
        "voice_persona": voice_persona,
        "persona_name": persona_name,
        "agent_prompt": (
            "You are {persona_name}, a calm and precise hiring coordinator at {company}. "
            "You are speaking with {callee_name} about a {job_role} role in {location}. "
            "Their profile: {candidate_headline}. "
            "Screening focus: {screening_focus}. "
            "Confirm identity, explain the purpose of the call in one sentence, then ask one question at a time. "
            "Collect interest, notice period, current and expected compensation, years of relevant experience, "
            "and earliest joining date. If they decline, ask why and close politely. "
            "Never invent compensation numbers. Never pressure. Keep answers short."
        ),
        "objective": (
            "Screen candidates for {company} on a {job_role} opening and return structured hiring signals."
        ),
        "introduction": (
            "Hi {callee_name}, this is {persona_name} from {company}. "
            "I am calling about a {job_role} role in {location}. Is this a good time for a two minute conversation?"
        ),
        "result_prompt": (
            "Extract structured hiring signals from the conversation. "
            "Use unknown if the candidate did not answer. recommendation should be advance, hold, or reject."
        ),
        "result_schema": HIRING_RESULT_SCHEMA,
    }


def outreach_agent_payload(
    *,
    name: str = "VoxHire Reachout",
    language: str = "ENGLISH",
    voice_persona: str = "ROY",
    persona_name: str = "Kabir",
    company: str = "VoxHire",
) -> dict:
    return {
        "name": name,
        "language": language,
        "voice_persona": voice_persona,
        "persona_name": persona_name,
        "agent_prompt": (
            "You are {persona_name}, a respectful talent partner at {company}. "
            "You found {callee_name} as a potential match for a {job_role} in {location}. "
            "Their profile: {candidate_headline}. Focus: {screening_focus}. "
            "This is a first-touch reachout, not a full interview. "
            "Ask if they are open to exploring the role, what they are working on now, "
            "and whether a follow-up conversation with the hiring manager makes sense. "
            "Offer WhatsApp or a later callback if they are busy. Never be salesy."
        ),
        "objective": (
            "Reach out to sourced talent for a {job_role} at {company} and capture interest plus next steps."
        ),
        "introduction": (
            "Hello {callee_name}, this is {persona_name} from {company}. "
            "I came across your profile for a {job_role} in {location} and wanted to share a quick opportunity. "
            "Do you have a minute?"
        ),
        "result_prompt": (
            "Summarize interest, role fit, current situation, preferred next step, timing, and any objections."
        ),
        "result_schema": OUTREACH_RESULT_SCHEMA,
    }
