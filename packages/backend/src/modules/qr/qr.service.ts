// ============================================================
// QR Code Service
// Generation, verification, scan tracking, counterfeit detection
// ============================================================

import crypto from 'crypto';
import QRCode from 'qrcode';
import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import { config } from '../../config';
import logger from '../../config/logger';
import type { GenerateQrInput } from './qr.validation';

export class QrService {
  /**
   * Generate QR codes for a batch
   */
  async generate(tenantId: string, input: GenerateQrInput) {
    const db = getDb();

    const batch = await db('seed_batches').where({ id: input.batchId, tenant_id: tenantId }).first();
    if (!batch) throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');

    const qrCodes = [];

    for (let i = 0; i < input.count; i++) {
      const publicToken = crypto.randomBytes(32).toString('base64url');
      const verificationUrl = `${config.qr.baseUrl}/${publicToken}`;
      const packageId = input.count > 1 ? `${input.packagePrefix || batch.batch_number}-PKG-${String(i + 1).padStart(5, '0')}` : null;

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      });

      const [qr] = await db('qr_codes').insert({
        tenant_id: tenantId,
        batch_id: input.batchId,
        package_id: packageId,
        public_token: publicToken,
        qr_data: qrDataUrl,
        status: 'active',
      }).returning('*');

      qrCodes.push({
        id: qr.id,
        publicToken: qr.public_token,
        packageId: qr.package_id,
        verificationUrl,
        qrData: qrDataUrl,
        status: qr.status,
      });
    }

    logger.info('QR codes generated', { batchId: input.batchId, count: input.count });
    return qrCodes;
  }

  /**
   * Public verification endpoint — no authentication required.
   * Logs the scan and returns product passport.
   */
  async verify(publicToken: string, scanInfo?: { latitude?: number; longitude?: number; ipAddress?: string; userAgent?: string; scannedBy?: string }) {
    const db = getDb();

    const qrCode = await db('qr_codes').where({ public_token: publicToken }).first();
    if (!qrCode) throw new AppError('Invalid QR code', 404, 'INVALID_QR');

    // Determine scan result based on QR status
    let scanResult: 'valid' | 'suspicious' | 'revoked' | 'expired' = 'valid';
    const warnings: string[] = [];

    if (qrCode.status === 'revoked') {
      scanResult = 'revoked';
      warnings.push('This QR code has been revoked. The product may be counterfeit.');
    } else if (qrCode.status === 'expired') {
      scanResult = 'expired';
      warnings.push('This QR code has expired.');
    }

    // Log the scan
    const [scan] = await db('qr_scans').insert({
      qr_code_id: qrCode.id,
      scanned_by: scanInfo?.scannedBy || null,
      latitude: scanInfo?.latitude || null,
      longitude: scanInfo?.longitude || null,
      ip_address: scanInfo?.ipAddress || null,
      user_agent: scanInfo?.userAgent || null,
      scan_result: scanResult,
    }).returning('*');

    // Increment scan count
    await db('qr_codes')
      .where({ id: qrCode.id })
      .update({ scan_count: db.raw('scan_count + 1'), last_scanned_at: new Date() });

    // Check for suspicious patterns
    const suspiciousChecks = await this.checkSuspiciousPatterns(qrCode.id, db);
    if (suspiciousChecks.isSuspicious && scanResult === 'valid') {
      scanResult = 'suspicious';
      warnings.push(...suspiciousChecks.reasons);
    }

    // Get batch and product information
    const batch = await db('seed_batches')
      .where({ 'seed_batches.id': qrCode.batch_id })
      .leftJoin('products', 'seed_batches.product_id', 'products.id')
      .leftJoin('tenants', 'seed_batches.tenant_id', 'tenants.id')
      .select(
        'seed_batches.*',
        'products.name as product_name', 'products.brand_name', 'products.crop_type',
        'products.seed_variety', 'products.certifications',
        'tenants.name as manufacturer_name',
      )
      .first();

    // Check expiry
    if (batch && new Date(batch.expiry_date) < new Date()) {
      warnings.push('This product has expired.');
      if (scanResult === 'valid') scanResult = 'expired';
    }

    // Get supply chain journey
    const events = await db('supply_chain_events')
      .where({ batch_id: qrCode.batch_id })
      .leftJoin('users', 'supply_chain_events.actor_id', 'users.id')
      .select('supply_chain_events.event_type', 'supply_chain_events.created_at',
        'users.first_name', 'users.last_name', 'users.role')
      .orderBy('supply_chain_events.created_at', 'asc');

    // Get latest risk score
    const riskScore = await db('risk_scores')
      .where({ batch_id: qrCode.batch_id })
      .orderBy('calculated_at', 'desc')
      .first();

    // Determine verification status
    let verificationStatus: 'verified' | 'suspicious' | 'warning' | 'unverified' = 'verified';
    if (scanResult === 'revoked') verificationStatus = 'warning';
    else if (scanResult === 'suspicious') verificationStatus = 'suspicious';
    else if (scanResult === 'expired') verificationStatus = 'warning';
    else if (riskScore && riskScore.score >= 50) verificationStatus = 'suspicious';
    else if (riskScore && riskScore.score >= 75) verificationStatus = 'warning';

    return {
      verificationStatus,
      scanResult,
      product: batch ? {
        productName: batch.product_name,
        brandName: batch.brand_name,
        cropType: batch.crop_type,
        seedVariety: batch.seed_variety,
        batchNumber: batch.batch_number,
        manufacturerName: batch.manufacturer_name,
        manufacturingDate: batch.manufacturing_date,
        expiryDate: batch.expiry_date,
        isExpired: new Date(batch.expiry_date) < new Date(),
        certifications: batch.certifications || [],
      } : null,
      journey: events.map((e: any) => ({
        stage: e.event_type,
        actor: `${e.first_name} ${e.last_name}`,
        role: e.role,
        date: e.created_at,
        verified: true,
      })),
      riskLevel: riskScore?.risk_level || 'low',
      riskScore: riskScore?.score || 0,
      warnings,
      totalScans: qrCode.scan_count + 1,
    };
  }

  /**
   * Check for suspicious scan patterns
   */
  private async checkSuspiciousPatterns(qrCodeId: string, db: any) {
    const reasons: string[] = [];
    let isSuspicious = false;

    // Check scan frequency: >10 scans in last 10 minutes
    const recentScans = await db('qr_scans')
      .where({ qr_code_id: qrCodeId })
      .where('scanned_at', '>', db.raw("NOW() - INTERVAL '10 minutes'"))
      .count('id as count')
      .first();

    if (parseInt(recentScans?.count as string || '0', 10) > 10) {
      isSuspicious = true;
      reasons.push('Unusual number of scans detected in a short period.');
    }

    // Check geographic inconsistency: scans from distant locations within short time
    const lastTwoScans = await db('qr_scans')
      .where({ qr_code_id: qrCodeId })
      .whereNotNull('latitude')
      .whereNotNull('longitude')
      .orderBy('scanned_at', 'desc')
      .limit(2);

    if (lastTwoScans.length === 2) {
      const [latest, previous] = lastTwoScans;
      const distance = this.haversineDistance(
        parseFloat(latest.latitude), parseFloat(latest.longitude),
        parseFloat(previous.latitude), parseFloat(previous.longitude),
      );
      const timeDiffMs = new Date(latest.scanned_at).getTime() - new Date(previous.scanned_at).getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

      // More than 100km in less than 2 hours
      if (distance > 100 && timeDiffHours < 2) {
        isSuspicious = true;
        reasons.push('Geographic inconsistency detected between consecutive scans.');
      }
    }

    return { isSuspicious, reasons };
  }

  /**
   * Haversine distance formula (km)
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async listByBatch(batchId: string, tenantId: string) {
    return getDb()('qr_codes')
      .where({ batch_id: batchId, tenant_id: tenantId })
      .orderBy('created_at', 'desc');
  }

  async revoke(id: string, tenantId: string) {
    const [updated] = await getDb()('qr_codes')
      .where({ id, tenant_id: tenantId })
      .update({ status: 'revoked', updated_at: new Date() })
      .returning('*');
    if (!updated) throw new AppError('QR code not found', 404, 'NOT_FOUND');
    return updated;
  }

  async getScanHistory(qrCodeId: string) {
    return getDb()('qr_scans')
      .where({ qr_code_id: qrCodeId })
      .orderBy('scanned_at', 'desc')
      .limit(100);
  }
}

export const qrService = new QrService();

