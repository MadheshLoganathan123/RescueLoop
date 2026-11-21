import json
import logging
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.entities import AuditLog

logger = logging.getLogger("rescueloop.audit")

async def log_audit_event(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = "127.0.0.1"
) -> AuditLog:
    details_str = json.dumps(details) if isinstance(details, (dict, list)) else str(details) if details else None
    
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        details=details_str
    )
    db.add(log)
    try:
        await db.flush()
    except Exception as e:
        logger.warning(f"Could not persist audit event {action}: {e}")
    return log
