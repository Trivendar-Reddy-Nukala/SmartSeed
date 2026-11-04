"""
SmartSeed AI Engine — Configuration module.
Loads all configuration from environment variables with sensible defaults.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

# Load .env file if present (development only; in production env vars are injected)
load_dotenv()


@dataclass(frozen=True)
class Settings:
    """Immutable application settings loaded from environment variables."""

    host: str = os.getenv("AI_ENGINE_HOST", "0.0.0.0")
    port: int = int(os.getenv("AI_ENGINE_PORT", "8000"))
    api_key: str = os.getenv("AI_API_KEY", "change-this-in-production")
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:3000")
    log_level: str = os.getenv("LOG_LEVEL", "debug")
    model_version: str = os.getenv("MODEL_VERSION", "0.1.0")
    cors_origins: list[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        origins_raw = os.getenv("CORS_ORIGINS", "*")
        # frozen dataclass — use object.__setattr__ for post-init
        object.__setattr__(
            self,
            "cors_origins",
            [o.strip() for o in origins_raw.split(",")],
        )


# Singleton settings instance
settings = Settings()
