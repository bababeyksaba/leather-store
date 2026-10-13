"""Trez form-POST adapter for the leather-store OTP flow.

Only Django (already used by the project) and Python's standard library are used.
The request fields follow the successful cURL supplied by the project owner.

IMPORTANT: the pattern endpoint's complete response contract was not available.
The observed successful body was a bare integer. This adapter provisionally
accepts bare integers > 1000, consistent with Trez's *different*, documented
SendMessage method. This is NOT proof of handset delivery, nor a verified error
mapping for SendPatternWithPost. Reject other bodies until documented otherwise.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID

TREZ_ENDPOINT = "https://smspanel.trez.ir/SendPatternWithPost.ashx"
MAX_RESPONSE_BYTES = 4096
MAX_MESSAGE_ID = 2**63 - 1


class TrezSMSError(Exception):
    """An error safe to log: never contains the body, access hash, phone or OTP."""

    def __init__(self, kind: str, provider_code: str = "") -> None:
        self.kind = kind
        self.provider_code = provider_code
        super().__init__(kind)


@dataclass(frozen=True)
class TrezConfig:
    access_hash: str = field(repr=False)
    sender: str
    pattern_id: str
    timeout_seconds: float = 10.0


def get_trez_config() -> TrezConfig:
    # Lazy import also lets the transport tests run without installing Django.
    from django.conf import settings

    key = str(getattr(settings, "TREZ_ACCESS_HASH", "") or "").strip()
    sender = str(getattr(settings, "TREZ_PHONE_NUMBER", "") or "").strip()
    pattern = str(getattr(settings, "TREZ_PATTERN_ID", "") or "").strip()
    if (
        not key
        or key in {"***", "REPLACE_WITH_NEW_ACCESS_HASH", "YOUR_ACCESS_HASH"}
        or not re.fullmatch(r"[0-9]{5,20}", sender)
    ):
        raise TrezSMSError("configuration")
    try:
        UUID(pattern)
        timeout = float(getattr(settings, "TREZ_TIMEOUT_SECONDS", 10))
    except (ValueError, TypeError, AttributeError):
        raise TrezSMSError("configuration") from None
    if not math.isfinite(timeout) or not 1 <= timeout <= 30:
        raise TrezSMSError("configuration")
    return TrezConfig(key, sender, pattern, timeout)


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Do not forward credentials to a different endpoint or change POST to GET.
        return None


def parse_submission_id(raw: bytes) -> str:
    """Parse the observed numeric shape; see the contract caveat above."""
    if len(raw) > MAX_RESPONSE_BYTES:
        raise TrezSMSError("unexpected_response")
    try:
        text = raw.decode("utf-8-sig").strip()
    except UnicodeDecodeError:
        raise TrezSMSError("unexpected_response") from None
    if not re.fullmatch(r"-?[0-9]{1,19}", text):
        raise TrezSMSError("unexpected_response")
    value = int(text)
    if -1000 <= value <= 1000:
        # Preserve only small numeric codes, not an arbitrary provider response.
        raise TrezSMSError("provider_code", str(value))
    if not 1000 < value <= MAX_MESSAGE_ID:
        raise TrezSMSError("unexpected_response")
    return str(value)


def send_trez_otp(phone: str, code: str, config: TrezConfig | None = None) -> str:
    """Submit exactly one OTP SMS; return a provisional provider message ID.

    The timeout applies to blocking socket operations, not a hard total deadline.
    No automatic retry is performed: a timeout may occur after provider acceptance.
    """
    if not isinstance(phone, str) or not re.fullmatch(r"09[0-9]{9}", phone):
        raise TrezSMSError("invalid_phone")
    if not isinstance(code, str) or not re.fullmatch(r"[0-9]{6}", code):
        raise TrezSMSError("invalid_code")
    config = config if config is not None else get_trez_config()
    body = urlencode({
        "AccessHash": config.access_hash,
        "PhoneNumber": config.sender,
        "PatternId": config.pattern_id,
        "token2": code,
        "Smsclass": "1",
        "RecNumber": phone,
        "token1": "کاربر",
    }).encode("utf-8")
    request = Request(
        TREZ_ENDPOINT,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "text/plain, */*;q=0.5",
        },
        method="POST",
    )
    try:
        # Default HTTPS handling verifies the certificate. Never disable it.
        opener = build_opener(_NoRedirect())
        with opener.open(request, timeout=config.timeout_seconds) as response:
            if response.status != 200:
                raise TrezSMSError("http", str(response.status))
            raw = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        status = exc.code
        exc.close()
        raise TrezSMSError("http", str(status)) from None
    except (URLError, TimeoutError, OSError, HTTPException):
        raise TrezSMSError("network") from None
    return parse_submission_id(raw)
