import os
from pathlib import Path
from typing import List, Any
from dotenv import load_dotenv
from pydantic import field_validator
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
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./rescueloop.db"
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Any) -> str:
        return normalize_database_url(v)
    
    # Security
    JWT_SECRET: str = "rescueloop-enterprise-secure-jwt-key-99887766"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    # AI Agents
    GEMINI_API_KEY: str = ""
    AGENT_ROUTER_URL: str = ""

    class Config:
        env_file = [str(root_env), str(backend_env), ".env"]
        extra = "allow"

settings = Settings()
