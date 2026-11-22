import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Any, Dict, List

from backend.app.config import settings

logger = logging.getLogger("rescueloop.email")

# Non-production mailbox so tests can read the reset token without an SMTP server.
# Production does not keep message bodies in memory.
outbound_log: List[Dict[str, Any]] = []
_MAX_LOG = 20


def _smtp_send(to_email: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(message)


async def send_email(to_email: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Deliver email through SMTP when configured.
    Otherwise print the message and return success so auth flows keep working offline.
    """
    if settings.ENVIRONMENT.lower() != "production":
        outbound_log.append({"to": to_email, "subject": subject, "body": body})
        del outbound_log[:-_MAX_LOG]

    if settings.SMTP_HOST:
        try:
            await asyncio.to_thread(_smtp_send, to_email, subject, body)
            logger.info("Email sent via SMTP to %s", to_email)
            return {"success": True, "provider": "smtp", "to": to_email}
        except Exception as exc:
            logger.error("SMTP delivery failed for %s: %s", to_email, exc)
            return {"success": False, "provider": "smtp", "error": str(exc)}

    logger.info("Email console fallback to %s | %s", to_email, subject)
    print("\n=======================================================")
    print(f"[EMAIL GATEWAY] -> {to_email}")
    print(f"Subject: {subject}")
    print(body)
    print("=======================================================\n")
    return {"success": True, "provider": "console", "to": to_email}
