from typing import Any

import httpx
from fastapi import HTTPException

from app.config import get_settings


class HunarError(HTTPException):
    def __init__(self, status_code: int, detail: Any):
        super().__init__(status_code=status_code, detail=detail)


class HunarClient:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.hunar_configured:
            raise HunarError(
                503,
                "HUNAR_API_KEY is not set. Add it to backend/.env — never commit the key.",
            )
        self.base_url = settings.hunar_base_url.rstrip("/")
        self.headers = {
            "X-API-Key": settings.hunar_api_key,
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        url = f"{self.base_url}{path}"
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.request(method, url, headers=self.headers, **kwargs)
        except httpx.HTTPError as exc:
            raise HunarError(502, f"Hunar API unreachable: {exc}") from exc

        if response.status_code >= 400:
            try:
                payload = response.json()
            except ValueError:
                payload = {"message": response.text}
            raise HunarError(response.status_code, payload)
        if not response.content:
            return None
        return response.json()

    def list_agents(self, page: int = 1, page_size: int = 50) -> dict[str, Any]:
        return self._request("GET", "/agents/", params={"page": page, "page_size": page_size})

    def get_agent(self, agent_id: str) -> dict[str, Any]:
        return self._request("GET", f"/agents/{agent_id}/")

    def create_agent(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/agents/", json=payload)

    def update_agent(self, agent_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("PUT", f"/agents/{agent_id}/", json=payload)

    def list_calls(self, **params: Any) -> dict[str, Any]:
        clean = {k: v for k, v in params.items() if v not in (None, "")}
        return self._request("GET", "/calls/", params=clean)

    def get_call(self, call_id: str) -> dict[str, Any]:
        return self._request("GET", f"/calls/{call_id}/")

    def create_call(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/calls/", json=payload)

    def create_bulk_calls(self, payload: dict[str, Any]) -> Any:
        return self._request("POST", "/calls/bulk/", json=payload)

    def cancel_call(self, call_id: str) -> Any:
        # External docs list create/list/get only; try common cancel shapes.
        attempts = [
            ("POST", f"/calls/{call_id}/cancel/", None),
            ("POST", f"/calls/{call_id}/cancel", None),
            ("DELETE", f"/calls/{call_id}/", None),
            ("PATCH", f"/calls/{call_id}/", {"status": "CANCELLED", "lifecycle_status": "CANCELLED"}),
            ("PUT", f"/calls/{call_id}/", {"status": "CANCELLED"}),
        ]
        last_error: Exception | None = None
        for method, path, body in attempts:
            try:
                kwargs = {"json": body} if body is not None else {}
                return self._request(method, path, **kwargs)
            except HunarError as exc:
                last_error = exc
                continue
        if last_error:
            raise last_error
        raise HunarError(404, "No cancel endpoint available")

    def list_numbers(self, page: int = 1, page_size: int = 20) -> dict[str, Any]:
        return self._request("GET", "/numbers/", params={"page": page, "page_size": page_size})


def hunar() -> HunarClient:
    return HunarClient()


def callback_config() -> dict[str, str] | None:
    settings = get_settings()
    base = settings.callback_base_url.rstrip("/")
    if not base:
        return None
    webhook = f"{base}/api/webhooks/hunar"
    return {
        "call_status_callback_url": webhook,
        "call_recording_callback_url": webhook,
        "call_result_callback_url": webhook,
        "call_summary_callback_url": webhook,
    }
