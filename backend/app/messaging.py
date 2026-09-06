from app.config import get_settings


def compose_followup_message(
    *,
    channel: str,
    name: str,
    company: str,
    job_role: str,
    location: str,
) -> str:
    place = f" in {location}" if location else ""
    if channel == "whatsapp":
        return (
            f"Hi {name}, this is {company}. We tried reaching you about a {job_role} role{place}. "
            "Reply YES for a 10-minute callback, or share a better time."
        )
    return (
        f"Hi {name}, {company} called you about a {job_role} opening{place}. "
        "Reply YES to schedule a callback."
    )


def send_twilio_message(*, channel: str, to_number: str, body: str) -> tuple[bool, str]:
    settings = get_settings()
    sid = settings.twilio_account_sid
    token = settings.twilio_auth_token
    if channel == "whatsapp":
        sender = settings.twilio_whatsapp_from
        to_value = to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
        from_value = sender if sender.startswith("whatsapp:") else f"whatsapp:{sender}"
        if not settings.whatsapp_configured:
            return False, "queued_local"
    else:
        from_value = settings.twilio_from_number
        to_value = to_number
        if not settings.twilio_configured:
            return False, "queued_local"

    try:
        import httpx

        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                auth=(sid, token),
                data={"From": from_value, "To": to_value, "Body": body},
            )
        if response.status_code >= 400:
            return False, response.text
        return True, response.json().get("sid", "sent")
    except Exception as exc:  # pragma: no cover - network path
        return False, str(exc)
