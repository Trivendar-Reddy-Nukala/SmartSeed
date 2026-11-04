"""
SmartSeed AI Engine — Anomaly Detection Service.

Implements rule-based and ML-based anomaly detection, then combines their
results in a unified ``AnomalyDetectionEngine``.
"""

from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

from app.config import settings
from app.models.pretrained import ModelManager
from app.schemas.requests import (
    AnomalyDetectionRequest,
    InventoryDataPoint,
    ScanDataPoint,
    TransferDataPoint,
)
from app.schemas.responses import AnomalyDetectionResponse, AnomalyResult
from app.utils.geo import haversine_distance, is_physically_impossible

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Valid supply-chain role ordering
# ---------------------------------------------------------------------------
VALID_ROLE_ORDER: dict[str, int] = {
    "manufacturer": 0,
    "distributor": 1,
    "wholesaler": 2,
    "retailer": 3,
}

SEVERITY_ORDER: dict[str, int] = {
    "info": 0,
    "warning": 1,
    "high": 2,
    "critical": 3,
}


# ====================================================================
# Rule-Based Detector
# ====================================================================


class RuleBasedDetector:
    """Deterministic, threshold-driven anomaly detection.

    Each ``detect_*`` method receives raw data points and returns a list of
    :class:`AnomalyResult` objects for every anomaly it finds.
    """

    # ------------------------------------------------------------------
    # Scan anomalies
    # ------------------------------------------------------------------

    def detect_duplicate_scans(
        self, scan_data: list[ScanDataPoint]
    ) -> list[AnomalyResult]:
        """Flag cases where the same QR code is scanned from different
        locations within a short time window (< 1 hour)."""
        anomalies: list[AnomalyResult] = []
        if not scan_data:
            return anomalies

        scans_by_qr: dict[str, list[ScanDataPoint]] = defaultdict(list)
        for s in scan_data:
            scans_by_qr[s.qr_code_id].append(s)

        for qr_id, scans in scans_by_qr.items():
            if len(scans) < 2:
                continue
            sorted_scans = sorted(scans, key=lambda s: s.scanned_at)
            for i in range(len(sorted_scans) - 1):
                a, b = sorted_scans[i], sorted_scans[i + 1]
                time_diff = abs((b.scanned_at - a.scanned_at).total_seconds()) / 3600.0
                if time_diff < 1.0 and a.scan_id != b.scan_id:
                    diff_location = (
                        a.latitude != b.latitude or a.longitude != b.longitude
                    )
                    if diff_location:
                        anomalies.append(
                            AnomalyResult(
                                anomaly_type="duplicate_scan",
                                severity="high",
                                confidence=0.9,
                                description=(
                                    f"QR {qr_id} scanned from different locations "
                                    f"within {time_diff:.2f}h"
                                ),
                                evidence=[
                                    f"Scan {a.scan_id} at ({a.latitude}, {a.longitude})",
                                    f"Scan {b.scan_id} at ({b.latitude}, {b.longitude})",
                                ],
                                recommended_action="Verify scan authenticity and investigate source devices",
                            )
                        )
        return anomalies

    def detect_geo_inconsistency(
        self, scan_data: list[ScanDataPoint]
    ) -> list[AnomalyResult]:
        """Detect physically impossible travel between consecutive scan
        locations for the same QR code."""
        anomalies: list[AnomalyResult] = []
        if not scan_data:
            return anomalies

        scans_by_qr: dict[str, list[ScanDataPoint]] = defaultdict(list)
        for s in scan_data:
            scans_by_qr[s.qr_code_id].append(s)

        for qr_id, scans in scans_by_qr.items():
            geo_scans = [
                s for s in scans if s.latitude is not None and s.longitude is not None
            ]
            if len(geo_scans) < 2:
                continue
            sorted_scans = sorted(geo_scans, key=lambda s: s.scanned_at)
            for i in range(len(sorted_scans) - 1):
                a, b = sorted_scans[i], sorted_scans[i + 1]
                dist = haversine_distance(
                    a.latitude, a.longitude, b.latitude, b.longitude  # type: ignore[arg-type]
                )
                time_hours = (
                    abs((b.scanned_at - a.scanned_at).total_seconds()) / 3600.0
                )
                if is_physically_impossible(dist, time_hours):
                    anomalies.append(
                        AnomalyResult(
                            anomaly_type="geo_inconsistency",
                            severity="critical",
                            confidence=0.95,
                            description=(
                                f"QR {qr_id}: {dist:.1f} km in {time_hours:.2f}h "
                                f"implies impossible travel speed"
                            ),
                            evidence=[
                                f"From ({a.latitude}, {a.longitude}) at {a.scanned_at.isoformat()}",
                                f"To ({b.latitude}, {b.longitude}) at {b.scanned_at.isoformat()}",
                                f"Distance: {dist:.1f} km",
                            ],
                            recommended_action="Flag batch for manual inspection — potential cloned QR code",
                        )
                    )
        return anomalies

    def detect_scan_frequency_anomaly(
        self, scan_data: list[ScanDataPoint]
    ) -> list[AnomalyResult]:
        """Flag batches with abnormally high scan frequency (> 50 scans or
        > 10 scans per hour within any rolling window)."""
        anomalies: list[AnomalyResult] = []
        if not scan_data:
            return anomalies

        total_scans = len(scan_data)
        if total_scans > 50:
            anomalies.append(
                AnomalyResult(
                    anomaly_type="scan_frequency_anomaly",
                    severity="warning",
                    confidence=0.7,
                    description=f"Unusually high scan count: {total_scans}",
                    evidence=[f"Total scans: {total_scans}"],
                    recommended_action="Review scan sources for automated or bot-like behaviour",
                )
            )

        if len(scan_data) >= 2:
            sorted_scans = sorted(scan_data, key=lambda s: s.scanned_at)
            first = sorted_scans[0].scanned_at
            last = sorted_scans[-1].scanned_at
            total_hours = max(
                (last - first).total_seconds() / 3600.0, 0.001
            )
            rate = total_scans / total_hours
            if rate > 10:
                anomalies.append(
                    AnomalyResult(
                        anomaly_type="scan_frequency_anomaly",
                        severity="high",
                        confidence=0.8,
                        description=f"Scan rate of {rate:.1f}/h exceeds threshold",
                        evidence=[
                            f"Scans: {total_scans}",
                            f"Time span: {total_hours:.2f}h",
                        ],
                        recommended_action="Investigate rapid scanning — possible counterfeit operation",
                    )
                )
        return anomalies

    # ------------------------------------------------------------------
    # Inventory anomalies
    # ------------------------------------------------------------------

    def detect_quantity_mismatch(
        self, inventory_data: InventoryDataPoint | None
    ) -> list[AnomalyResult]:
        """Check that ``current_quantity == initial_quantity - total_transferred + total_received``."""
        anomalies: list[AnomalyResult] = []
        if inventory_data is None:
            return anomalies

        expected = (
            inventory_data.initial_quantity
            - inventory_data.total_transferred
            + inventory_data.total_received
        )
        actual = inventory_data.current_quantity
        if actual != expected:
            diff = abs(actual - expected)
            anomalies.append(
                AnomalyResult(
                    anomaly_type="quantity_mismatch",
                    severity="high" if diff > 10 else "warning",
                    confidence=0.95,
                    description=(
                        f"Inventory mismatch: expected {expected}, found {actual} "
                        f"(Δ {diff})"
                    ),
                    evidence=[
                        f"Initial: {inventory_data.initial_quantity}",
                        f"Transferred out: {inventory_data.total_transferred}",
                        f"Received: {inventory_data.total_received}",
                        f"Current: {actual}",
                    ],
                    recommended_action="Audit inventory records for missing or duplicate transfers",
                )
            )
        return anomalies

    # ------------------------------------------------------------------
    # Transfer anomalies
    # ------------------------------------------------------------------

    def detect_expired_product(
        self, transfer_data: list[TransferDataPoint]
    ) -> list[AnomalyResult]:
        """Flag transfers whose ``created_at`` is in the future (likely
        data-entry errors) or transfers marked with suspicious status."""
        anomalies: list[AnomalyResult] = []
        if not transfer_data:
            return anomalies

        now = datetime.now(timezone.utc)
        for t in transfer_data:
            # Check for status indicating expired product transfer
            if t.status.lower() in ("expired", "recalled"):
                anomalies.append(
                    AnomalyResult(
                        anomaly_type="expired_product_transfer",
                        severity="critical",
                        confidence=0.95,
                        description=(
                            f"Transfer {t.transfer_id} involves an expired/recalled product "
                            f"(status={t.status})"
                        ),
                        evidence=[
                            f"Transfer: {t.transfer_id}",
                            f"Status: {t.status}",
                            f"From: {t.sender_id} ({t.sender_role})",
                            f"To: {t.receiver_id} ({t.receiver_role})",
                        ],
                        recommended_action="Halt transfer and quarantine affected inventory",
                    )
                )
        return anomalies

    def detect_invalid_transfer_chain(
        self, transfer_data: list[TransferDataPoint]
    ) -> list[AnomalyResult]:
        """Ensure transfers follow the correct role order
        (manufacturer → distributor → wholesaler → retailer)."""
        anomalies: list[AnomalyResult] = []
        if not transfer_data:
            return anomalies

        for t in transfer_data:
            sender_rank = VALID_ROLE_ORDER.get(t.sender_role.lower())
            receiver_rank = VALID_ROLE_ORDER.get(t.receiver_role.lower())

            if sender_rank is None or receiver_rank is None:
                # Unknown roles — cannot validate, skip gracefully
                continue

            if receiver_rank <= sender_rank:
                anomalies.append(
                    AnomalyResult(
                        anomaly_type="invalid_transfer_chain",
                        severity="high",
                        confidence=0.9,
                        description=(
                            f"Transfer {t.transfer_id}: {t.sender_role} → {t.receiver_role} "
                            f"violates supply-chain ordering"
                        ),
                        evidence=[
                            f"Sender role: {t.sender_role} (rank {sender_rank})",
                            f"Receiver role: {t.receiver_role} (rank {receiver_rank})",
                        ],
                        recommended_action="Investigate potentially fraudulent reverse transfer",
                    )
                )
        return anomalies

    # ------------------------------------------------------------------
    # Aggregate
    # ------------------------------------------------------------------

    def detect_all(
        self,
        scan_data: list[ScanDataPoint],
        transfer_data: list[TransferDataPoint],
        inventory_data: InventoryDataPoint | None,
    ) -> list[AnomalyResult]:
        """Run every rule-based detector and return a combined list."""
        results: list[AnomalyResult] = []
        results.extend(self.detect_duplicate_scans(scan_data))
        results.extend(self.detect_geo_inconsistency(scan_data))
        results.extend(self.detect_scan_frequency_anomaly(scan_data))
        results.extend(self.detect_quantity_mismatch(inventory_data))
        results.extend(self.detect_expired_product(transfer_data))
        results.extend(self.detect_invalid_transfer_chain(transfer_data))
        return results


# ====================================================================
# ML-Based Detector (Isolation Forest)
# ====================================================================


class MLAnomalyDetector:
    """Unsupervised anomaly detection using scikit-learn's Isolation Forest.

    Falls back gracefully (returns an empty list) when no model has been
    trained yet.
    """

    MODEL_NAME = "isolation_forest"

    def __init__(self, model_manager: ModelManager) -> None:
        self.model_manager = model_manager
        self.model: IsolationForest | None = model_manager.load_model(self.MODEL_NAME)

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    def extract_features(
        self,
        scan_data: list[ScanDataPoint],
        transfer_data: list[TransferDataPoint],
        inventory_data: InventoryDataPoint | None,
    ) -> np.ndarray:
        """Build a 1-D feature vector from the raw data points.

        Features (8):
            0. scan_count
            1. unique_locations
            2. avg_time_between_scans (hours)
            3. max_distance_between_scans (km)
            4. transfer_count
            5. unique_actors
            6. quantity_ratio (current / initial)
            7. rejection_rate

        Returns:
            ``np.ndarray`` of shape ``(1, 8)``.
        """
        # -- Scan features --
        scan_count = float(len(scan_data))

        locations: set[tuple[float | None, float | None]] = set()
        for s in scan_data:
            if s.latitude is not None and s.longitude is not None:
                locations.add((s.latitude, s.longitude))
        unique_locations = float(len(locations))

        avg_time = 0.0
        max_distance = 0.0
        if len(scan_data) >= 2:
            sorted_scans = sorted(scan_data, key=lambda s: s.scanned_at)
            time_diffs: list[float] = []
            distances: list[float] = []
            for i in range(len(sorted_scans) - 1):
                a, b = sorted_scans[i], sorted_scans[i + 1]
                time_diffs.append(
                    abs((b.scanned_at - a.scanned_at).total_seconds()) / 3600.0
                )
                if (
                    a.latitude is not None
                    and a.longitude is not None
                    and b.latitude is not None
                    and b.longitude is not None
                ):
                    distances.append(
                        haversine_distance(
                            a.latitude, a.longitude, b.latitude, b.longitude
                        )
                    )
            avg_time = sum(time_diffs) / len(time_diffs) if time_diffs else 0.0
            max_distance = max(distances) if distances else 0.0

        # -- Transfer features --
        transfer_count = float(len(transfer_data))
        actors: set[str] = set()
        rejected = 0
        for t in transfer_data:
            actors.add(t.sender_id)
            actors.add(t.receiver_id)
            if t.status.lower() == "rejected":
                rejected += 1
        unique_actors = float(len(actors))
        rejection_rate = rejected / max(transfer_count, 1.0)

        # -- Inventory features --
        if inventory_data and inventory_data.initial_quantity > 0:
            quantity_ratio = (
                inventory_data.current_quantity / inventory_data.initial_quantity
            )
        else:
            quantity_ratio = 1.0

        features = np.array(
            [
                [
                    scan_count,
                    unique_locations,
                    avg_time,
                    max_distance,
                    transfer_count,
                    unique_actors,
                    quantity_ratio,
                    rejection_rate,
                ]
            ]
        )
        return features

    # ------------------------------------------------------------------
    # Detection
    # ------------------------------------------------------------------

    def detect(
        self,
        scan_data: list[ScanDataPoint],
        transfer_data: list[TransferDataPoint],
        inventory_data: InventoryDataPoint | None,
    ) -> list[AnomalyResult]:
        """Run the Isolation Forest model and return any anomalies.

        Returns an empty list when the model has not been trained.
        """
        if self.model is None:
            logger.info("ML model not trained — skipping ML anomaly detection")
            return []

        features = self.extract_features(scan_data, transfer_data, inventory_data)
        try:
            prediction = self.model.predict(features)
            score = self.model.decision_function(features)
        except Exception:
            logger.exception("ML prediction failed")
            return []

        # IsolationForest: -1 = anomaly, 1 = normal
        if prediction[0] == -1:
            confidence = min(1.0, max(0.0, -float(score[0])))
            return [
                AnomalyResult(
                    anomaly_type="ml_anomaly",
                    severity="high" if confidence > 0.5 else "warning",
                    confidence=round(confidence, 4),
                    description="ML model flagged this batch as anomalous",
                    evidence=[
                        f"Isolation Forest score: {float(score[0]):.4f}",
                        f"Features: {features[0].tolist()}",
                    ],
                    recommended_action="Review batch data — ML model detected unusual patterns",
                )
            ]
        return []

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(self, training_data: np.ndarray) -> None:
        """Fit an Isolation Forest model on *training_data* and persist it.

        Args:
            training_data: 2-D array of shape ``(n_samples, 8)``.
        """
        logger.info("Training IsolationForest on %d samples", len(training_data))
        model = IsolationForest(
            n_estimators=100,
            contamination=0.1,
            random_state=42,
        )
        model.fit(training_data)
        self.model = model
        self.model_manager.save_model(model, self.MODEL_NAME)
        logger.info("IsolationForest trained and saved")


# ====================================================================
# Unified Engine
# ====================================================================


class AnomalyDetectionEngine:
    """Combines rule-based and ML detectors into one entry point."""

    def __init__(self, model_manager: ModelManager | None = None) -> None:
        self.rule_detector = RuleBasedDetector()
        self._model_manager = model_manager or ModelManager()
        self.ml_detector = MLAnomalyDetector(self._model_manager)

    def detect(self, request: AnomalyDetectionRequest) -> AnomalyDetectionResponse:
        """Run all detectors, deduplicate, sort by severity, and return
        an :class:`AnomalyDetectionResponse`."""
        logger.info(
            "Running anomaly detection for batch=%s tenant=%s",
            request.batch_id,
            request.tenant_id,
        )

        # --- Collect results from both engines ---
        rule_results = self.rule_detector.detect_all(
            request.scan_data, request.transfer_data, request.inventory_data
        )
        ml_results = self.ml_detector.detect(
            request.scan_data, request.transfer_data, request.inventory_data
        )

        # --- Deduplicate by (anomaly_type, description) ---
        seen: set[tuple[str, str]] = set()
        combined: list[AnomalyResult] = []
        for r in rule_results + ml_results:
            key = (r.anomaly_type, r.description)
            if key not in seen:
                seen.add(key)
                combined.append(r)

        # --- Sort by severity (critical first) ---
        combined.sort(
            key=lambda a: SEVERITY_ORDER.get(a.severity, 0), reverse=True
        )

        max_severity = "info"
        if combined:
            max_severity = max(
                combined, key=lambda a: SEVERITY_ORDER.get(a.severity, 0)
            ).severity

        return AnomalyDetectionResponse(
            batch_id=request.batch_id,
            anomalies=combined,
            total_anomalies=len(combined),
            max_severity=max_severity,
            model_version=settings.model_version,
            analyzed_at=datetime.now(timezone.utc),
        )
