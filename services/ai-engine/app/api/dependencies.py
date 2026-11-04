"""
SmartSeed AI Engine — API key validation dependency.
"""

from __future__ import annotations

from fastapi import Header, HTTPException, status

from app.config import settings


async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")) -> str:
    """FastAPI dependency that validates the API key header.

    Raises:
        HTTPException: 401 if the key does not match the configured value.

    Returns:
        The validated API key string.
    """
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
    return x_api_key

