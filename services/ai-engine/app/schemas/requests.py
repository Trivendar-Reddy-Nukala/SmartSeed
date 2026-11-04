"""
SmartSeed AI Engine — Request schemas.
Pydantic models for all incoming API payloads with strict validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ScanDataPoint(BaseModel):
    """A single QR code scan event with location and device metadata."""

    scan_id: str = Field(..., min_length=1, description="Unique scan identifier")
    qr_code_id: str = Field(..., min_length=1, description="QR code that was scanned")
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Scan latitude")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Scan longitude")
    scanned_at: datetime = Field(..., description="Timestamp of the scan")
    ip_address: Optional[str] = Field(None, description="Scanner IP address")
    user_agent: Optional[str] = Field(None, description="Scanner user-agent string")
    scan_result: str = Field(..., description="Result of the scan (e.g. 'valid', 'invalid')")


class TransferDataPoint(BaseModel):
    """A single product transfer between supply-chain actors."""

    transfer_id: str = Field(..., min_length=1, description="Unique transfer identifier")
    sender_id: str = Field(..., min_length=1, description="ID of the sending entity")
    receiver_id: str = Field(..., min_length=1, description="ID of the receiving entity")
    sender_role: str = Field(..., description="Role of the sender in the supply chain")
    receiver_role: str = Field(..., description="Role of the receiver in the supply chain")
    quantity: int = Field(..., ge=0, description="Number of units transferred")
    status: str = Field(..., description="Transfer status (e.g. 'completed', 'rejected')")
    source_location: Optional[str] = Field(None, description="Origin location name")
    destination_location: Optional[str] = Field(None, description="Destination location name")
    created_at: datetime = Field(..., description="Timestamp when transfer was created")


class InventoryDataPoint(BaseModel):
    """Aggregated inventory snapshot for a batch."""

    initial_quantity: int = Field(..., ge=0, description="Quantity at batch creation")
    current_quantity: int = Field(..., ge=0, description="Current remaining quantity")
    total_transferred: int = Field(..., ge=0, description="Total units transferred out")
    total_received: int = Field(..., ge=0, description="Total units received")
    holder_count: int = Field(..., ge=0, description="Number of distinct holders")


class AnomalyDetectionRequest(BaseModel):
    """Payload for the anomaly-detection endpoint."""

    batch_id: str = Field(..., min_length=1, description="Batch to analyse")
    tenant_id: str = Field(..., min_length=1, description="Tenant scope")
    scan_data: list[ScanDataPoint] = Field(default_factory=list, description="Scan events")
    transfer_data: list[TransferDataPoint] = Field(default_factory=list, description="Transfer events")
    inventory_data: Optional[InventoryDataPoint] = Field(None, description="Inventory snapshot")


class RiskScoreRequest(BaseModel):
    """Payload for the risk-scoring endpoint."""

    batch_id: str = Field(..., min_length=1, description="Batch to score")
    tenant_id: str = Field(..., min_length=1, description="Tenant scope")
    anomalies: list[dict[str, Any]] = Field(default_factory=list, description="Detected anomalies")
    scan_stats: dict[str, Any] = Field(default_factory=dict, description="Aggregate scan statistics")
    transfer_stats: dict[str, Any] = Field(default_factory=dict, description="Aggregate transfer statistics")
    inventory_stats: dict[str, Any] = Field(default_factory=dict, description="Aggregate inventory statistics")
    historical_risk: Optional[float] = Field(None, ge=0.0, le=100.0, description="Previous risk score")


class InvestigationRequest(BaseModel):
    """Payload for the AI investigation endpoint."""

    batch_id: str = Field(..., min_length=1, description="Batch under investigation")
    tenant_id: str = Field(..., min_length=1, description="Tenant scope")
    alert_id: Optional[str] = Field(None, description="Alert that triggered this investigation")
    anomaly_predictions: list[dict[str, Any]] = Field(default_factory=list, description="Anomalies to investigate")
    scan_history: list[dict[str, Any]] = Field(default_factory=list, description="Historical scan data")
    transfer_history: list[dict[str, Any]] = Field(default_factory=list, description="Historical transfer data")
    supply_chain_events: list[dict[str, Any]] = Field(default_factory=list, description="Supply-chain lifecycle events")
