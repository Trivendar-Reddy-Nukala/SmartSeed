// ============================================================
// SmartSeed Shared Types
// Core type definitions used across backend, web, and mobile
// ============================================================

// ---- Enums ----

export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  MANUFACTURER = 'manufacturer',
  DISTRIBUTOR = 'distributor',
  WHOLESALER = 'wholesaler',
  RETAILER = 'retailer',
  FARMER = 'farmer',
  AUDITOR = 'auditor',
}

export enum TenantStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum SubscriptionPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum BatchStatus {
  CREATED = 'created',
  REGISTERED = 'registered',
  IN_INVENTORY = 'in_inventory',
  PARTIALLY_DISPATCHED = 'partially_dispatched',
  FULLY_DISPATCHED = 'fully_dispatched',
  EXPIRED = 'expired',
  RECALLED = 'recalled',
  UNDER_INVESTIGATION = 'under_investigation',
}

export enum TransferStatus {
  INITIATED = 'initiated',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  RECEIVED = 'received',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  UNDER_INVESTIGATION = 'under_investigation',
}

export enum ShipmentStatus {
  CREATED = 'created',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertType {
  SUSPICIOUS_SCAN = 'suspicious_scan',
  DUPLICATE_SCAN = 'duplicate_scan',
  GEO_INCONSISTENCY = 'geo_inconsistency',
  QUANTITY_MISMATCH = 'quantity_mismatch',
  EXPIRED_PRODUCT = 'expired_product',
  UNAUTHORIZED_TRANSFER = 'unauthorized_transfer',
  HIGH_RISK_BATCH = 'high_risk_batch',
  COUNTERFEIT_REPORT = 'counterfeit_report',
  INVESTIGATION_REQUIRED = 'investigation_required',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum InvestigationStatus {
  OPENED = 'opened',
  UNDER_INVESTIGATION = 'under_investigation',
  ADDITIONAL_VERIFICATION = 'additional_verification',
  CONFIRMED_SUSPICIOUS = 'confirmed_suspicious',
  FALSE_POSITIVE = 'false_positive',
  ESCALATED_MANUFACTURER = 'escalated_manufacturer',
  ESCALATED_AUTHORITY = 'escalated_authority',
  RESOLVED = 'resolved',
}

export enum SupplyChainEventType {
  MANUFACTURED = 'manufactured',
  BATCH_REGISTERED = 'batch_registered',
  DISPATCHED = 'dispatched',
  RECEIVED = 'received',
  REJECTED = 'rejected',
  SOLD_TO_FARMER = 'sold_to_farmer',
  FARMER_VERIFIED = 'farmer_verified',
  COUNTERFEIT_REPORTED = 'counterfeit_reported',
  RECALLED = 'recalled',
  INVESTIGATION_OPENED = 'investigation_opened',
  INVESTIGATION_RESOLVED = 'investigation_resolved',
}

export enum QrStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum NotificationType {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
}

// ---- Interfaces ----

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  subscriptionPlan: SubscriptionPlan;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  mfaEnabled: boolean;
  phone?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  brandName: string;
  cropType: string;
  seedVariety: string;
  description?: string;
  category?: string;
  packagingInfo?: string;
  regulatoryIds?: Record<string, string>;
  certifications?: string[];
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeedBatch {
  id: string;
  tenantId: string;
  productId: string;
  batchNumber: string;
  manufacturingDate: Date;
  expiryDate: Date;
  productionLocation: string;
  manufacturingFacility?: string;
  initialQuantity: number;
  currentQuantity: number;
  unitOfMeasurement: string;
  status: BatchStatus;
  certificationDocUrls?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transfer {
  id: string;
  tenantId: string;
  batchId: string;
  senderId: string;
  senderRole: UserRole;
  receiverId: string;
  receiverRole: UserRole;
  quantity: number;
  status: TransferStatus;
  sourceLocation?: string;
  destinationLocation?: string;
  dispatchDate?: Date;
  receiveDate?: Date;
  blockchainTxId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QrCode {
  id: string;
  tenantId: string;
  batchId: string;
  packageId?: string;
  publicToken: string;
  status: QrStatus;
  scanCount: number;
  lastScannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QrScan {
  id: string;
  qrCodeId: string;
  scannedBy?: string;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  userAgent?: string;
  scanResult: 'valid' | 'suspicious' | 'revoked' | 'expired';
  scannedAt: Date;
}

export interface SupplyChainEvent {
  id: string;
  tenantId: string;
  batchId: string;
  eventType: SupplyChainEventType;
  actorId: string;
  actorRole: UserRole;
  sourceLocation?: string;
  destinationLocation?: string;
  quantity?: number;
  blockchainTxId?: string;
  recordHash?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RiskScore {
  id: string;
  tenantId: string;
  batchId: string;
  score: number;
  riskLevel: RiskLevel;
  indicators: RiskIndicator[];
  modelVersion?: string;
  calculatedAt: Date;
}

export interface RiskIndicator {
  category: string;
  signal: string;
  weight: number;
  normalizedScore: number;
  description: string;
}

export interface AnomalyPrediction {
  id: string;
  tenantId: string;
  batchId: string;
  anomalyType: string;
  severity: AlertSeverity;
  confidence: number;
  features: Record<string, number>;
  modelName: string;
  modelVersion: string;
  description: string;
  recommendedAction: string;
  createdAt: Date;
}

export interface Investigation {
  id: string;
  tenantId: string;
  batchId: string;
  alertId?: string;
  status: InvestigationStatus;
  assignedTo?: string;
  riskScore: number;
  riskCategory: RiskLevel;
  mainSuspiciousActivity: string;
  supportingEvidence: InvestigationEvidence[];
  potentialExplanation?: string;
  recommendedSteps?: string[];
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestigationEvidence {
  type: 'scan_history' | 'blockchain_tx' | 'anomaly_prediction' | 'ownership_record' | 'user_report';
  description: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface Alert {
  id: string;
  tenantId: string;
  batchId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  riskScore: number;
  title: string;
  description: string;
  investigationId?: string;
  investigationStatus?: InvestigationStatus;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface BlockchainTransaction {
  id: string;
  tenantId: string;
  batchId: string;
  txId: string;
  channelName: string;
  chaincodeName: string;
  functionName: string;
  args: string[];
  recordHash: string;
  status: 'submitted' | 'committed' | 'failed';
  blockNumber?: number;
  timestamp: Date;
  createdAt: Date;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ---- API Types ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ---- Auth Types ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'createdAt' | 'updatedAt'>;
}

export interface TokenPayload {
  userId: string;
  tenantId: string | null;
  role: UserRole;
  email: string;
}

export interface RegisterTenantRequest {
  companyName: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  subscriptionPlan: SubscriptionPlan;
}

// ---- Risk & AI Types ----

export interface RiskAssessmentRequest {
  batchId: string;
  tenantId: string;
  scanData?: QrScan[];
  transferHistory?: Transfer[];
  inventoryData?: {
    initialQuantity: number;
    currentQuantity: number;
    totalTransferred: number;
  };
}

export interface RiskAssessmentResponse {
  batchId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  anomalyCategory: string;
  indicators: RiskIndicator[];
  severity: AlertSeverity;
  confidence: number;
  supportingEvidence: string[];
  recommendedAction: string;
  modelVersion: string;
  calculatedAt: string;
}

export interface InvestigationReportRequest {
  batchId: string;
  tenantId: string;
  alertId?: string;
  anomalyPredictions: AnomalyPrediction[];
  scanHistory: QrScan[];
  transferHistory: Transfer[];
  supplyChainEvents: SupplyChainEvent[];
}

export interface InvestigationReport {
  investigationId: string;
  batchId: string;
  riskScore: number;
  riskCategory: RiskLevel;
  mainSuspiciousActivity: string;
  supportingEvidence: InvestigationEvidence[];
  timeline: { timestamp: Date; event: string; details: string }[];
  potentialExplanation: string;
  recommendedSteps: string[];
  confidence: number;
  limitations: string[];
}

// ---- Digital Product Passport ----

export interface DigitalProductPassport {
  product: Pick<Product, 'name' | 'brandName' | 'cropType' | 'seedVariety' | 'description' | 'certifications'>;
  manufacturer: {
    name: string;
    location?: string;
  };
  batch: Pick<SeedBatch, 'batchNumber' | 'manufacturingDate' | 'expiryDate' | 'productionLocation' | 'status'>;
  supplyChainJourney: {
    eventType: SupplyChainEventType;
    actor: string;
    location?: string;
    timestamp: Date;
    verified: boolean;
  }[];
  qrIdentity: {
    publicToken: string;
    status: QrStatus;
    totalScans: number;
  };
  blockchainVerification: {
    verified: boolean;
    latestTxId?: string;
    totalTransactions: number;
  };
  riskStatus: {
    currentScore: number;
    riskLevel: RiskLevel;
    hasActiveInvestigation: boolean;
    warnings: string[];
  };
  expiryInfo: {
    expiryDate: Date;
    isExpired: boolean;
    daysUntilExpiry: number;
  };
}

// ---- Farmer-facing simplified passport ----

export interface PublicProductPassport {
  productName: string;
  brandName: string;
  cropType: string;
  seedVariety: string;
  batchNumber: string;
  manufacturerName: string;
  manufacturingDate: string;
  expiryDate: string;
  isExpired: boolean;
  certifications: string[];
  journey: {
    stage: string;
    date: string;
    verified: boolean;
  }[];
  verificationStatus: 'verified' | 'suspicious' | 'warning' | 'unverified';
  riskLevel: RiskLevel;
  warnings: string[];
}

