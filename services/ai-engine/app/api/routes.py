"""
SmartSeed AI Engine — API routes.

All endpoints require the ``X-API-Key`` header unless explicitly excluded.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.api.dependencies import verify_api_key
from app.config import settings
from app.models.pretrained import ModelManager
from app.schemas.requests import (
    AnomalyDetectionRequest,
    InvestigationRequest,
    RiskScoreRequest,
)
from app.schemas.responses import (
    AnomalyDetectionResponse,
    InvestigationResponse,
    ModelInfoResponse,
    RetrainResponse,
    RiskScoreResponse,
)
from app.services.anomaly_detector import AnomalyDetectionEngine
from app.services.investigation_agent import InvestigationAgent
from app.services.risk_scorer import RiskScorer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["SmartSeed AI"])

# -----------------------------------------------------------------------
# Service singletons (created once at import time)
# -----------------------------------------------------------------------
_model_manager = ModelManager()
_anomaly_engine = AnomalyDetectionEngine(model_manager=_model_manager)
_risk_scorer = RiskScorer()
_investigation_agent = InvestigationAgent()


# -----------------------------------------------------------------------
# Health (no API key)
# -----------------------------------------------------------------------
@router.get("/health", summary="Health check")
async def health_check() -> dict:
    """Lightweight liveness probe — no authentication required."""
    return {
        "status": "healthy",
        "service": "smartseed-ai-engine",
        "version": settings.model_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# -----------------------------------------------------------------------
# Anomaly Detection
# -----------------------------------------------------------------------
@router.post(
    "/detect-anomalies",
    response_model=AnomalyDetectionResponse,
    summary="Detect anomalies in batch data",
    dependencies=[Depends(verify_api_key)],
)
async def detect_anomalies(request: AnomalyDetectionRequest) -> AnomalyDetectionResponse:
    """Run rule-based and ML anomaly detection on scan, transfer, and
    inventory data for a given seed batch."""
    logger.info("Anomaly detection requested for batch=%s", request.batch_id)
    return _anomaly_engine.detect(request)


# -----------------------------------------------------------------------
# Risk Scoring
# -----------------------------------------------------------------------
@router.post(
    "/calculate-risk-score",
    response_model=RiskScoreResponse,
    summary="Calculate risk score for a batch",
    dependencies=[Depends(verify_api_key)],
)
async def calculate_risk_score(request: RiskScoreRequest) -> RiskScoreResponse:
    """Produce a weighted 0–100 risk score using anomaly, scan, transfer,
    and inventory signals."""
    logger.info("Risk score requested for batch=%s", request.batch_id)
    return _risk_scorer.calculate(request)


# -----------------------------------------------------------------------
# Investigation
# -----------------------------------------------------------------------
@router.post(
    "/investigate",
    response_model=InvestigationResponse,
    summary="Generate an AI investigation report",
    dependencies=[Depends(verify_api_key)],
)
async def investigate(request: InvestigationRequest) -> InvestigationResponse:
    """Run the evidence-based investigation agent and return a structured
    report with timeline, evidence, risk assessment, and recommendations."""
    logger.info("Investigation requested for batch=%s", request.batch_id)
    return _investigation_agent.investigate(request)


# -----------------------------------------------------------------------
# Model Info
# -----------------------------------------------------------------------
@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Get loaded model information",
    dependencies=[Depends(verify_api_key)],
)
async def model_info() -> ModelInfoResponse:
    """Return metadata about deployed ML models."""
    models = _model_manager.get_model_info()
    has_ml = _model_manager.has_model("isolation_forest")
    return ModelInfoResponse(
        model_version=settings.model_version,
        models=models,
        capabilities=[
            "rule_based_anomaly_detection",
            "ml_anomaly_detection" if has_ml else "ml_anomaly_detection (untrained)",
            "risk_scoring",
            "evidence_based_investigation",
        ],
        training_status="trained" if has_ml else "untrained",
    )


# -----------------------------------------------------------------------
# Retrain (placeholder)
# -----------------------------------------------------------------------
@router.post(
    "/retrain",
    response_model=RetrainResponse,
    summary="Trigger model retraining",
    dependencies=[Depends(verify_api_key)],
)
async def retrain() -> RetrainResponse:
    """Placeholder endpoint — accepts a retrain request.

    In production this would enqueue a background task to retrain
    the Isolation Forest on new labelled data.
    """
    logger.info("Retrain requested (placeholder)")
    return RetrainResponse(
        status="accepted",
        message=(
            "Retrain request accepted. In production this triggers an "
            "asynchronous training pipeline. Currently operating in "
            "rule-based mode only."
        ),
        model_version=settings.model_version,
    )

