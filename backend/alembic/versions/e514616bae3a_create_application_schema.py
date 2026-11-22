"""create_application_schema

Revision ID: e514616bae3a
Revises: e2620a1350e9
Create Date: 2026-11-22 19:02:40.595178

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e514616bae3a'
down_revision: Union[str, Sequence[str], None] = 'e2620a1350e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add reset tokens and OTP expiry columns without failing if create_all already applied them."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "users" in tables and "password_reset_tokens" not in tables:
        op.create_table(
            "password_reset_tokens",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)
        op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"], unique=False)

    if "missions" in tables:
        columns = {column["name"] for column in inspector.get_columns("missions")}
        if "otp_expires_at" not in columns:
            op.add_column("missions", sa.Column("otp_expires_at", sa.DateTime(), nullable=True))
        if "otp_sent_at" not in columns:
            op.add_column("missions", sa.Column("otp_sent_at", sa.DateTime(), nullable=True))
        if "otp_failed_attempts" not in columns:
            op.add_column("missions", sa.Column("otp_failed_attempts", sa.Integer(), nullable=True))


def downgrade() -> None:
    """Remove OTP expiry columns and the password reset table when present."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "missions" in tables:
        columns = {column["name"] for column in inspector.get_columns("missions")}
        if "otp_failed_attempts" in columns:
            op.drop_column("missions", "otp_failed_attempts")
        if "otp_sent_at" in columns:
            op.drop_column("missions", "otp_sent_at")
        if "otp_expires_at" in columns:
            op.drop_column("missions", "otp_expires_at")

    if "password_reset_tokens" in tables:
        indexes = {index["name"] for index in inspector.get_indexes("password_reset_tokens")}
        if "ix_password_reset_tokens_user_id" in indexes:
            op.drop_index("ix_password_reset_tokens_user_id", table_name="password_reset_tokens")
        if "ix_password_reset_tokens_token_hash" in indexes:
            op.drop_index("ix_password_reset_tokens_token_hash", table_name="password_reset_tokens")
        op.drop_table("password_reset_tokens")
