"""
SmartSeed AI Engine — Risk Scoring Service.

Computes a weighted 0-100 risk score for a product batch by combining
anomaly, scan, transfer, inventory, and historical signals.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.schemas.requests import RiskScoreRequest
from app.schemas.responses import RiskIndicator, RiskScoreResponse
from app.utils.math_utils import min_max_normalize, sigmoid, weighted_average

logger = logging.getLogger(__name__)


class RiskScorer:
    """Weighted risk scorer.

    Default category weights (must sum to 1.0):

    ========== ====
    Category   Weight
    ========== ====
    anomaly    0.35
    scan       0.15
    transfer   0.20
    inventory  0.15
    historical 0.15
    ========== ====
    """

    DEFAULT_WEIGHTS: dict[str, float] = {
        "anomaly_score": 0.35,
        "scan_anomaly": 0.15,
        "transfer_anomaly": 0.20,
        "inventory_anomaly": 0.15,
        "historical_risk": 0.15,
    }

    def __init__(self, weights: dict[str, float] | None = None) -> None:
        self.weights = weights or dict(self.DEFAULT_WEIGHTS)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calculate(self, request: RiskScoreRequest) -> RiskScoreResponse:
        """Produce a 0-100 risk score and structured response."""
        logger.info(
            "Calculating risk score for batch=%s tenant=%s",
            request.batch_id,
            request.tenant_id,
        )

        anomaly_score, anomaly_indicators = self._score_anomalies(request.anomalies)
        scan_score, scan_indicators = self._score_scans(request.scan_stats)
        transfer_score, transfer_indicators = self._score_transfers(
            request.transfer_stats
        )
        inventory_score, inventory_indicators = self._score_inventory(
            request.inventory_stats
        )

        historical_score = (
            request.historical_risk / 100.0
            if request.historical_risk is not None
            else 0.0
        )

        # Weighted combination → 0-1 range
        raw = weighted_average(
            [
                (anomaly_score, self.weights["anomaly_score"]),
                (scan_score, self.weights["scan_anomaly"]),
                (transfer_score, self.weights["transfer_anomaly"]),
                (inventory_score, self.weights["inventory_anomaly"]),
                (historical_score, self.weights["historical_risk"]),
            ]
        )

        final_score = int(round(min_max_normalize(raw, 0.0, 1.0) * 100))
        risk_level = self._determine_risk_level(final_score)

        all_indicators = (
            anomaly_indicators
            + scan_indicators
            + transfer_indicators
            + inventory_indicators
        )

        return RiskScoreResponse(
            batch_id=request.batch_id,
            score=final_score,
            risk_level=risk_level,
            indicators=all_indicators,
            recommended_action=self._recommend_action(risk_level, all_indicators),
            model_version=settings.model_version,
            calculated_at=datetime.now(timezone.utc),
        )

    # ------------------------------------------------------------------
    # Sub-scorers
    # ------------------------------------------------------------------

    def _score_anomalies(
        self, anomalies: list[dict[str, Any]]
    ) -> tuple[float, list[RiskIndicator]]:
        """Score based on detected anomalies."""
        indicators: list[RiskIndicator] = []
        if not anomalies:
            return 0.0, indicators

        severity_weights = {"info": 0.1, "warning": 0.3, "high": 0.7, "critical": 1.0}
        total = 0.0
        for a in anomalies:
            sev = a.get("severity", "info")
            w = severity_weights.get(sev, 0.1)
            total += w
            indicators.append(
                RiskIndicator(
                    category="anomaly",
                    signal=a.get("anomaly_type", "unknown"),
                    weight=self.weights["anomaly_score"],
                    normalized_score=w,
                    description=a.get("description", "Detected anomaly"),
                )
            )

        score = min(1.0, total / max(len(anomalies), 1))
        return score, indicators

    def _score_scans(
        self, scan_stats: dict[str, Any]
    ) -> tuple[float, list[RiskIndicator]]:
        """Score based on scan statistics."""
        indicators: list[RiskIndicator] = []
        if not scan_stats:
            return 0.0, indicators

        score = 0.0

        # High total scan count
        total_scans = scan_stats.get("total_scans", 0)
        if total_scans > 50:
            s = min_max_normalize(float(total_scans), 0.0, 200.0)
            score = max(score, s)
            indicators.append(
                RiskIndicator(
                    category="scan",
                    signal="high_scan_count",
                    weight=self.weights["scan_anomaly"],
                    normalized_score=s,
                    description=f"Elevated scan count: {total_scans}",
                )
            )

        # Unique IPs ratio
        unique_ips = scan_stats.get("unique_ips", 0)
        if total_scans > 0 and unique_ips > 0:
            ratio = unique_ips / total_scans
            if ratio < 0.1:
                s = 1.0 - ratio
                score = max(score, s)
                indicators.append(
                    RiskIndicator(
                        category="scan",
                        signal="low_ip_diversity",
                        weight=self.weights["scan_anomaly"],
                        normalized_score=round(s, 4),
                        description=f"Low IP diversity: {unique_ips} IPs / {total_scans} scans",
                    )
                )

        # Invalid scan ratio
        invalid = scan_stats.get("invalid_scans", 0)
        if total_scans > 0 and invalid > 0:
            inv_ratio = invalid / total_scans
            if inv_ratio > 0.1:
                s = min(1.0, inv_ratio * 2)
                score = max(score, s)
                indicators.append(
                    RiskIndicator(
                        category="scan",
                        signal="high_invalid_ratio",
                        weight=self.weights["scan_anomaly"],
                        normalized_score=round(s, 4),
                        description=f"{invalid}/{total_scans} scans were invalid",
                    )
                )

        return score, indicators

    def _score_transfers(
        self, transfer_stats: dict[str, Any]
    ) -> tuple[float, list[RiskIndicator]]:
        """Score based on transfer statistics."""
        indicators: list[RiskIndicator] = []
        if not transfer_stats:
            return 0.0, indicators

        score = 0.0

        # Rejection rate
        total = transfer_stats.get("total_transfers", 0)
        rejected = transfer_stats.get("rejected_transfers", 0)
        if total > 0 and rejected > 0:
            rej_ratio = rejected / total
            if rej_ratio > 0.05:
                s = min(1.0, rej_ratio * 3)
                score = max(score, s)
                indicators.append(
                    RiskIndicator(
                        category="transfer",
                        signal="high_rejection_rate",
                        weight=self.weights["transfer_anomaly"],
                        normalized_score=round(s, 4),
                        description=f"{rejected}/{total} transfers were rejected",
                    )
                )

        # Invalid chain transfers
        invalid_chain = transfer_stats.get("invalid_chain_count", 0)
        if invalid_chain > 0:
            s = min(1.0, invalid_chain * 0.3)
            score = max(score, s)
            indicators.append(
                RiskIndicator(
                    category="transfer",
                    signal="invalid_chain",
                    weight=self.weights["transfer_anomaly"],
                    normalized_score=round(s, 4),
                    description=f"{invalid_chain} transfers violate role ordering",
                )
            )

        return score, indicators

    def _score_inventory(
        self, inventory_stats: dict[str, Any]
    ) -> tuple[float, list[RiskIndicator]]:
        """Score based on inventory statistics."""
        indicators: list[RiskIndicator] = []
        if not inventory_stats:
            return 0.0, indicators

        score = 0.0

        mismatch = inventory_stats.get("quantity_mismatch", 0)
        initial = inventory_stats.get("initial_quantity", 1)
        if mismatch != 0 and initial > 0:
            s = min(1.0, abs(mismatch) / initial)
            score = max(score, s)
            indicators.append(
                RiskIndicator(
                    category="inventory",
                    signal="quantity_mismatch",
                    weight=self.weights["inventory_anomaly"],
                    normalized_score=round(s, 4),
                    description=f"Inventory mismatch of {abs(mismatch)} units",
                )
            )

        # Abnormal holder count
        holder_count = inventory_stats.get("holder_count", 0)
        if holder_count > 20:
            s = min_max_normalize(float(holder_count), 0.0, 100.0)
            score = max(score, s)
            indicators.append(
                RiskIndicator(
                    category="inventory",
                    signal="high_holder_count",
                    weight=self.weights["inventory_anomaly"],
                    normalized_score=round(s, 4),
                    description=f"Unusually high holder count: {holder_count}",
                )
            )

        return score, indicators

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _determine_risk_level(score: int) -> str:
        """Map a 0-100 score to a risk category.

        - ``low``:      score < 30
        - ``medium``:   30 ≤ score < 60
        - ``high``:     60 ≤ score < 80
        - ``critical``: score ≥ 80
        """
        if score < 30:
            return "low"
        if score < 60:
            return "medium"
        if score < 80:
            return "high"
        return "critical"

    @staticmethod
    def _recommend_action(
        risk_level: str, indicators: list[RiskIndicator]
    ) -> str:
        """Generate a human-readable recommended action based on risk level."""
        actions: dict[str, str] = {
            "low": "No immediate action required. Continue routine monitoring.",
            "medium": (
                "Increase monitoring frequency. Review flagged indicators "
                "and verify data integrity."
            ),
            "high": (
                "Initiate investigation. Temporarily restrict batch movement "
                "and notify supply-chain partners."
            ),
            "critical": (
                "URGENT: Halt all batch operations immediately. Launch full "
                "investigation and notify regulatory authorities if applicable."
            ),
        }
        base = actions.get(risk_level, actions["low"])

        # Append top indicator context if available
        if indicators:
            top = max(indicators, key=lambda i: i.normalized_score)
            base += f" Top signal: {top.signal} ({top.description})."

        return base
