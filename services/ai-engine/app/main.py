"""
SmartSeed AI Engine — FastAPI application entry point.

Run directly with::

    python -m app.main

Or via uvicorn::

    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from app.api.routes import router
from app.config import settings

# -----------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.DEBUG),
    format="%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("smartseed.ai")


# -----------------------------------------------------------------------
# Lifespan (startup / shutdown)
# -----------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("=" * 60)
    logger.info("  SmartSeed AI Engine v%s starting", settings.model_version)
    logger.info("  Host : %s:%s", settings.host, settings.port)
    logger.info("  CORS : %s", settings.cors_origins)
    logger.info("  Log  : %s", settings.log_level)
    logger.info("=" * 60)
    yield
    logger.info("SmartSeed AI Engine shutting down")


# -----------------------------------------------------------------------
# App
# -----------------------------------------------------------------------
app = FastAPI(
    title="SmartSeed AI Engine",
    description=(
        "Anomaly detection, risk scoring, and evidence-based investigation "
        "engine for the SmartSeed seed supply-chain traceability platform."
    ),
    version=settings.model_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------
# Request-logging middleware
# -----------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with method, path, and latency."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s — %d (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


# -----------------------------------------------------------------------
# Global exception handler
# -----------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Please try again later.",
        },
    )


# -----------------------------------------------------------------------
# Mount routes
# -----------------------------------------------------------------------
app.include_router(router)


# -----------------------------------------------------------------------
# Root
# -----------------------------------------------------------------------
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "SmartSeed AI Engine",
        "version": settings.model_version,
        "docs": "/docs",
    }


# -----------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower(),
    )

