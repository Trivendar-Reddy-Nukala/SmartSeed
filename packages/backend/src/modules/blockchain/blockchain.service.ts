// ============================================================
// Blockchain Service — Simulation mode for development
// Wraps all blockchain interactions
// ============================================================

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import logger from '../../config/logger';

export class BlockchainService {
  private isSimulation: boolean;

  constructor() {
    this.isSimulation = config.blockchain.simulation;
    if (this.isSimulation) {
      logger.info('Blockchain service running in SIMULATION mode');
    }
  }

  /**
   * Compute SHA-256 hash of any data object
   */
  computeHash(data: Record<string, unknown>): string {
    const jsonStr = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  async registerProduct(productId: string, tenantId: string, productData: Record<string, unknown>): Promise<string> {
    if (this.isSimulation) {
      return this.simulateTx('RegisterProduct', [productId, tenantId, this.computeHash(productData)]);
    }
    // TODO: Real Fabric SDK call
    throw new Error('Live blockchain not configured');
  }

  async registerBatch(batchId: string, productId: string, tenantId: string, batchData: Record<string, unknown>): Promise<string> {
    if (this.isSimulation) {
      return this.simulateTx('RegisterBatch', [batchId, productId, tenantId, this.computeHash(batchData)]);
    }
    throw new Error('Live blockchain not configured');
  }

  async transferBatch(transferId: string, batchId: string, senderId: string, receiverId: string, quantity: number, transferData: Record<string, unknown>): Promise<string> {
    if (this.isSimulation) {
      return this.simulateTx('TransferBatch', [transferId, batchId, senderId, receiverId, String(quantity), this.computeHash(transferData)]);
    }
    throw new Error('Live blockchain not configured');
  }

  async acceptBatch(transferId: string): Promise<string> {
    if (this.isSimulation) {
      return this.simulateTx('AcceptBatch', [transferId]);
    }
    throw new Error('Live blockchain not configured');
  }

  async rejectBatch(transferId: string, reason: string): Promise<string> {
    if (this.isSimulation) {
      return this.simulateTx('RejectBatch', [transferId, reason]);
    }
    throw new Error('Live blockchain not configured');
  }

  async recordVerification(verificationId: string, batchId: string, verifiedBy: string, result: string): Promise<string> {
    if (this.isSimulation) {
      return this.simulateTx('RecordFarmerVerification', [verificationId, batchId, verifiedBy, result]);
    }
    throw new Error('Live blockchain not configured');
  }

  async recordCounterfeitReport(reportId: string, batchId: string, reportedBy: string, reason: string): Promise<string> {
    if (this.isSimulation) {
      return this.simulateTx('RecordCounterfeitReport', [reportId, batchId, reportedBy, reason]);
    }
    throw new Error('Live blockchain not configured');
  }

  private simulateTx(functionName: string, args: string[]): string {
    const txId = `sim_${uuidv4().replace(/-/g, '')}`;
    logger.debug('Blockchain simulation', { functionName, args: args.slice(0, 3), txId });
    return txId;
  }
}

export const blockchainService = new BlockchainService();

