import os
from pathlib import Path
from typing import List, Any
from dotenv import load_dotenv
from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings

# Search and load .env from root and backend directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
backend_env = BASE_DIR / "backend" / ".env"
root_env = BASE_DIR / ".env"

if root_env.exists():
    load_dotenv(dotenv_path=root_env, override=False)
if backend_env.exists():
    load_dotenv(dotenv_path=backend_env, override=False)

def normalize_database_url(url: Any) -> str:
    """Ensure database URL uses the correct async driver dialect."""
    if not url:
        return "sqlite+aiosqlite:///./rescueloop.db"
    clean_url = str(url).strip().strip('"').strip("'")
    if clean_url.startswith("postgresql://"):
        return clean_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if clean_url.startswith("postgres://"):
        return clean_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if clean_url.startswith("sqlite:///") and "+aiosqlite" not in clean_url:
        return clean_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return clean_url

class Settings(BaseSettings):
    PROJECT_NAME: str = "RescueLoop API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./rescueloop.db"
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Any) -> str:
        return normalize_database_url(v)
    
    # Security
    JWT_SECRET: str = Field(
        default="rescueloop_super_secure_jwt_secret_key_production_2026_0123456789",
        validation_alias=AliasChoices("JWT_SECRET", "SECRET_KEY"),
        min_length=32,
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ],
        validation_alias=AliasChoices("CORS_ORIGINS", "BACKEND_CORS_ORIGINS"),
    )

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        if value.startswith(("change-this-in-production", "replace-with-")) or value == "rescueloop-enterprise-secure-jwt-key-99887766":
            raise ValueError("JWT_SECRET must be a locally generated secret, not an example/default value")
        return value

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors_origins(cls, origins: List[str]) -> List[str]:
        if "*" in origins:
            raise ValueError("CORS_ORIGINS must list explicit origins when credentials are enabled")
        return origins
    
    # AI Agents (Agent Router API)
    AGENT_ROUTER_API_KEY: str = ""
    AGENT_ROUTER_BASE_URL: str = "https://api.agentrouter.to/api/agentic-api"
    AGENT_ROUTER_MODEL: str = ""
    AGENT_ROUTER_TIMEOUT_SECONDS: float = 12.0
    OPENROUTER_API_KEY: str = ""

    # SMS / OTP Delivery
    SMS_PROVIDER: str = "console"
    SMS_API_KEY: str = ""
    SMS_API_SECRET: str = ""
    SMS_SENDER_ID: str = "RescueLoop"

    # Storage & Uploads
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")

    # Public app URL used in password-reset links
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # Email (SMTP). Empty host keeps a console fallback so local runs still work.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@rescueloop.local"
    SMTP_USE_TLS: bool = True

    class Config:
        env_file = [str(root_env), str(backend_env), ".env"]
        extra = "allow"

settings = Settings()
