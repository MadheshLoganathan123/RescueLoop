import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.models.entities import Notification, User

logger = logging.getLogger("rescueloop.notifications")

async def create_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    message: str,
    type: str = "INFO"
) -> Notification:
    """
    Creates and persists an in-app notification for a given user.
    Types: INFO, WARNING, SUCCESS, URGENT, ACTION_REQUIRED
    """
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        is_read=False
    )
    db.add(notif)
    await db.flush()
    logger.info(f"Notification created for user {user_id}: [{type}] {title}")
    return notif

async def notify_role(
    db: AsyncSession,
    role: str,
    title: str,
    message: str,
    type: str = "INFO"
) -> List[Notification]:
    """
    Broadcasts a notification to all users of a specific role (e.g. 'ops').
    """
    res = await db.execute(select(User).where(User.role == role))
    users = res.scalars().all()
    created = []
    for u in users:
        n = Notification(
            user_id=u.id,
            title=title,
            message=message,
            type=type,
            is_read=False
        )
        db.add(n)
        created.append(n)
    await db.flush()
    return created
