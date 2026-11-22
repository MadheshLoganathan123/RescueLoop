from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.app.config import settings

# Tight limits on credential and OTP endpoints. Disabled under pytest so the
# suite can sign in repeatedly from one client without tripping 429s.
LOGIN_LIMIT = "10/minute"
REGISTER_LIMIT = "5/minute"
OTP_VERIFY_LIMIT = "8/minute"
PASSWORD_RESET_LIMIT = "5/minute"

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    enabled=settings.ENVIRONMENT.lower() != "test",
)
