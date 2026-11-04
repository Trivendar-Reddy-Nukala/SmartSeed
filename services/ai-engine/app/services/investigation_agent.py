"""
SmartSeed AI Engine — Investigation Agent.

An evidence-based, rule-driven investigation engine that analyses supply-chain
data and produces structured reports.  No LLM dependency — all reasoning is
deterministic and explainable.
"""

from __future__ import annotations

import logging
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.schemas.requests import InvestigationRequest
from app.schemas.responses import (
    InvestigationEvidence,
    InvestigationResponse,
    TimelineEvent,
)

logger = logging.getLogger(__name__)


class InvestigationAgent:
    """Deterministic investigation agent for suspicious seed batches.

    Given anomaly predictions, scan history, transfer history, and supply-chain
    events, the agent builds a chronological timeline, identifies patterns, and
    produces a structured investigation report with evidence, risk assessment,
    and recommended next steps.
    """

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def investigate(self, request: InvestigationRequest) -> InvestigationResponse:
        """Run a full investigation and return a structured report."""
        logger.info(
            "Starting investigation for batch=%s tenant=%s",
            request.batch_id,
            request.tenant_id,
        )

        timeline = self._build_timeline(
            request.scan_history,
            request.transfer_history,
            request.supply_chain_events,
        )
        patterns = self._analyze_patterns(
            request.anomaly_predictions,
            request.scan_history,
            request.transfer_history,
        )
        evidence = self._collect_evidence(
            request.anomaly_predictions,
            request.scan_history,
            request.transfer_history,
        )
        main_activity = self._determine_main_activity(patterns)
        explanation = self._generate_explanation(patterns)
        risk_score = self._compute_risk_score(patterns, evidence)
        risk_category = self._risk_level(risk_score)
        steps = self._recommend_steps(risk_score, patterns)
        confidence = self._assess_confidence(len(evidence), len(request.anomaly_predictions))
        limitations = self._list_limitations()

        investigation_id = request.alert_id or str(uuid.uuid4())

        return InvestigationResponse(
            investigation_id=investigation_id,
            batch_id=request.batch_id,
            risk_score=risk_score,
            risk_category=risk_category,
            main_suspicious_activity=main_activity,
            supporting_evidence=evidence,
            timeline=timeline,
            potential_explanation=explanation,
            recommended_steps=steps,
            confidence=confidence,
            limitations=limitations,
            generated_at=datetime.now(timezone.utc),
        )

    # ------------------------------------------------------------------
    # Timeline
    # ------------------------------------------------------------------

    def _build_timeline(
        self,
        scan_history: list[dict[str, Any]],
        transfer_history: list[dict[str, Any]],
        supply_chain_events: list[dict[str, Any]],
    ) -> list[TimelineEvent]:
        """Merge all events into a single chronological timeline."""
        events: list[TimelineEvent] = []

        for scan in scan_history:
            ts = self._parse_ts(scan.get("scanned_at") or scan.get("timestamp"))
            events.append(
                TimelineEvent(
                    timestamp=ts,
                    event="QR Code Scanned",
                    details=(
                        f"Scan result: {scan.get('scan_result', 'unknown')}. "
                        f"Location: ({scan.get('latitude', '?')}, {scan.get('longitude', '?')})"
                    ),
                )
            )

        for tx in transfer_history:
            ts = self._parse_ts(tx.get("created_at") or tx.get("timestamp"))
            events.append(
                TimelineEvent(
                    timestamp=ts,
                    event=f"Transfer {tx.get('status', 'initiated')}",
                    details=(
                        f"{tx.get('sender_role', '?')} → {tx.get('receiver_role', '?')}, "
                        f"quantity: {tx.get('quantity', '?')}"
                    ),
                )
            )

        for sc_event in supply_chain_events:
            ts = self._parse_ts(sc_event.get("created_at") or sc_event.get("timestamp"))
            events.append(
                TimelineEvent(
                    timestamp=ts,
                    event=str(sc_event.get("event_type", "Unknown event")).replace("_", " ").title(),
                    details=sc_event.get("description", sc_event.get("details", "No additional details")),
                )
            )

        events.sort(key=lambda e: e.timestamp)
        return events

    # ------------------------------------------------------------------
    # Pattern analysis
    # ------------------------------------------------------------------

    def _analyze_patterns(
        self,
        anomaly_predictions: list[dict[str, Any]],
        scan_history: list[dict[str, Any]],
        transfer_history: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Identify suspicious patterns from the raw data."""
        patterns: dict[str, Any] = {
            "anomaly_types": [],
            "anomaly_count": len(anomaly_predictions),
            "high_severity_count": 0,
            "scan_count": len(scan_history),
            "transfer_count": len(transfer_history),
            "duplicate_scans": False,
            "geo_inconsistency": False,
            "quantity_mismatch": False,
            "invalid_chain": False,
            "rapid_scanning": False,
            "rejection_rate": 0.0,
            "suspicious_scan_rate": 0.0,
        }

        # Analyse anomaly types
        type_counter: Counter[str] = Counter()
        for anom in anomaly_predictions:
            atype = anom.get("anomaly_type", "unknown")
            type_counter[atype] += 1
            sev = anom.get("severity", "info")
            if sev in ("high", "critical"):
                patterns["high_severity_count"] += 1

        patterns["anomaly_types"] = list(type_counter.keys())

        # Flag specific anomaly patterns
        patterns["duplicate_scans"] = "duplicate_scan" in type_counter
        patterns["geo_inconsistency"] = "geo_inconsistency" in type_counter
        patterns["quantity_mismatch"] = "quantity_mismatch" in type_counter
        patterns["invalid_chain"] = "invalid_transfer_chain" in type_counter
        patterns["rapid_scanning"] = "scan_frequency_anomaly" in type_counter

        # Transfer rejection rate
        if transfer_history:
            rejections = sum(1 for t in transfer_history if t.get("status") == "rejected")
            patterns["rejection_rate"] = rejections / len(transfer_history)

        # Suspicious scan ratio
        if scan_history:
            suspicious = sum(1 for s in scan_history if s.get("scan_result") != "valid")
            patterns["suspicious_scan_rate"] = suspicious / len(scan_history)

        return patterns

    # ------------------------------------------------------------------
    # Evidence collection
    # ------------------------------------------------------------------

    def _collect_evidence(
        self,
        anomaly_predictions: list[dict[str, Any]],
        scan_history: list[dict[str, Any]],
        transfer_history: list[dict[str, Any]],
    ) -> list[InvestigationEvidence]:
        """Collect all supporting evidence for the investigation."""
        evidence: list[InvestigationEvidence] = []

        # Evidence from anomalies
        for anom in anomaly_predictions:
            evidence.append(
                InvestigationEvidence(
                    type="anomaly",
                    description=anom.get("description", f"Anomaly: {anom.get('anomaly_type', 'unknown')}"),
                    data={
                        "anomaly_type": anom.get("anomaly_type"),
                        "severity": anom.get("severity"),
                        "confidence": anom.get("confidence"),
                        "evidence": anom.get("evidence", []),
                    },
                    timestamp=self._parse_ts(anom.get("created_at")),
                )
            )

        # Evidence from suspicious scans
        for scan in scan_history:
            if scan.get("scan_result") not in ("valid", None):
                evidence.append(
                    InvestigationEvidence(
                        type="scan",
                        description=f"Suspicious scan: result={scan.get('scan_result')}",
                        data={
                            "scan_id": scan.get("scan_id"),
                            "result": scan.get("scan_result"),
                            "latitude": scan.get("latitude"),
                            "longitude": scan.get("longitude"),
                        },
                        timestamp=self._parse_ts(scan.get("scanned_at")),
                    )
                )

        # Evidence from rejected transfers
        for tx in transfer_history:
            if tx.get("status") == "rejected":
                evidence.append(
                    InvestigationEvidence(
                        type="transfer",
                        description=(
                            f"Rejected transfer: {tx.get('sender_role')} → {tx.get('receiver_role')}, "
                            f"qty={tx.get('quantity')}"
                        ),
                        data={
                            "transfer_id": tx.get("transfer_id"),
                            "sender_role": tx.get("sender_role"),
                            "receiver_role": tx.get("receiver_role"),
                            "quantity": tx.get("quantity"),
                        },
                        timestamp=self._parse_ts(tx.get("created_at")),
                    )
                )

        evidence.sort(key=lambda e: e.timestamp)
        return evidence

    # ------------------------------------------------------------------
    # Synthesis helpers
    # ------------------------------------------------------------------

    def _determine_main_activity(self, patterns: dict[str, Any]) -> str:
        """Determine the primary suspicious activity based on pattern analysis."""
        if patterns.get("geo_inconsistency"):
            return (
                "Geographically impossible scan activity detected — the same QR code was "
                "scanned at distant locations within a timeframe that makes physical "
                "travel impossible, suggesting duplication or interception."
            )
        if patterns.get("duplicate_scans"):
            return (
                "Duplicate scan patterns detected — the same QR code was scanned "
                "multiple times from different devices/locations, which may indicate "
                "counterfeit copies of the seed packaging."
            )
        if patterns.get("quantity_mismatch"):
            return (
                "Inventory quantity discrepancy — the recorded quantities do not "
                "match expected values based on manufacturing and transfer records, "
                "suggesting possible diversion or tampering."
            )
        if patterns.get("invalid_chain"):
            return (
                "Invalid supply-chain transfer sequence — transfers occurred outside "
                "the expected manufacturer → distributor → wholesaler → retailer flow, "
                "indicating potential bypass or unauthorized redistribution."
            )
        if patterns.get("rapid_scanning"):
            return (
                "Abnormally high scan frequency detected — the batch received "
                "significantly more scans than expected, which may indicate "
                "counterfeiting activity or an organized verification attack."
            )
        if patterns.get("anomaly_count", 0) > 0:
            return (
                f"Multiple anomalies detected ({patterns['anomaly_count']} total) across "
                f"supply-chain data requiring manual review."
            )
        return "No specific suspicious activity identified — flagged for routine review."

    def _generate_explanation(self, patterns: dict[str, Any]) -> str:
        """Generate a potential explanation narrative."""
        explanations: list[str] = []

        if patterns.get("geo_inconsistency") or patterns.get("duplicate_scans"):
            explanations.append(
                "The most likely explanation is that counterfeit copies of the seed "
                "packaging (including QR codes) are in circulation. An alternative — "
                "though less likely — explanation is that a GPS spoofing tool was used "
                "during scanning."
            )
        if patterns.get("quantity_mismatch"):
            explanations.append(
                "The quantity discrepancy could result from unrecorded transfers, "
                "data-entry errors, or deliberate diversion of product outside "
                "the authorised supply chain."
            )
        if patterns.get("invalid_chain"):
            explanations.append(
                "The irregular transfer sequence may indicate grey-market redistribution "
                "or an administrative error in role assignment."
            )
        if patterns.get("rejection_rate", 0) > 0.3:
            explanations.append(
                f"A high transfer rejection rate ({patterns['rejection_rate']:.0%}) "
                f"suggests quality or documentation issues at one or more stages."
            )

        return " ".join(explanations) if explanations else (
            "Insufficient data to determine a definitive explanation. "
            "A manual review of physical inventory and documentation is recommended."
        )

    def _compute_risk_score(
        self,
        patterns: dict[str, Any],
        evidence: list[InvestigationEvidence],
    ) -> int:
        """Compute an overall risk score (0–100) from patterns and evidence."""
        score = 0.0

        # Base score from anomaly count and severity
        score += min(patterns.get("anomaly_count", 0) * 8, 30)
        score += min(patterns.get("high_severity_count", 0) * 12, 30)

        # Specific pattern bonuses
        if patterns.get("geo_inconsistency"):
            score += 15
        if patterns.get("duplicate_scans"):
            score += 12
        if patterns.get("quantity_mismatch"):
            score += 10
        if patterns.get("invalid_chain"):
            score += 10
        if patterns.get("rapid_scanning"):
            score += 5

        # Evidence density
        score += min(len(evidence) * 2, 10)

        # Suspicious scan rate
        score += patterns.get("suspicious_scan_rate", 0) * 10

        # Rejection rate
        score += patterns.get("rejection_rate", 0) * 8

        return max(0, min(100, int(round(score))))

    @staticmethod
    def _risk_level(score: int) -> str:
        if score >= 80:
            return "critical"
        if score >= 60:
            return "high"
        if score >= 30:
            return "medium"
        return "low"

    def _recommend_steps(self, risk_score: int, patterns: dict[str, Any]) -> list[str]:
        """Produce actionable investigation steps."""
        steps: list[str] = []

        if risk_score >= 80:
            steps.append("URGENT: Immediately suspend further transfers of this batch pending investigation.")
            steps.append("Notify the manufacturer and request physical verification of batch inventory.")

        if patterns.get("geo_inconsistency") or patterns.get("duplicate_scans"):
            steps.append("Contact retailers who scanned the product and request photographic evidence of packaging.")
            steps.append("Compare physical QR codes at flagged locations for signs of reprinting or tampering.")

        if patterns.get("quantity_mismatch"):
            steps.append("Perform a physical inventory count at all supply-chain nodes holding this batch.")
            steps.append("Cross-reference transfer documents with blockchain records for discrepancies.")

        if patterns.get("invalid_chain"):
            steps.append("Audit the supply-chain path and verify authorization of all transfer participants.")

        if risk_score >= 60:
            steps.append("Generate a detailed compliance report for regulatory authorities.")
            steps.append("Escalate to the manufacturer's quality-assurance team.")

        steps.append("Document all findings and update the investigation record in SmartSeed.")
        steps.append("Continue monitoring this batch for further anomalies over the next 72 hours.")

        return steps

    def _assess_confidence(self, evidence_count: int, anomaly_count: int) -> float:
        """Compute investigation confidence (0.0–1.0)."""
        if evidence_count == 0 and anomaly_count == 0:
            return 0.1
        base = 0.3
        base += min(evidence_count * 0.05, 0.3)
        base += min(anomaly_count * 0.08, 0.3)
        return min(base, 0.95)

    @staticmethod
    def _list_limitations() -> list[str]:
        return [
            "Based on available digital data only — physical inspection not performed.",
            "Rule-based analysis without ML model confirmation.",
            "Confidence is limited by the volume and completeness of recorded events.",
            "GPS coordinates rely on device reporting and may be spoofed.",
            "Investigation does not constitute a legal determination of counterfeiting.",
        ]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_ts(value: Any) -> datetime:
        """Best-effort timestamp parsing."""
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                pass
        return datetime.now(timezone.utc)

