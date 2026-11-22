"""initial_schema

Revision ID: e2620a1350e9
Revises: 
Create Date: 2026-11-22 18:01:41.213320

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2620a1350e9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Baseline stamp.

    The original tables were created by SQLAlchemy metadata.create_all.
    Later columns and tables are added in e514616bae3a.
    """
    pass


def downgrade() -> None:
    """Baseline stamp. Table removal is intentionally not performed here."""
    pass
