/**
 * SmartSeed Blockchain — High-Level Service
 *
 * Wraps the FabricClient with SmartSeed-specific operations.
 * Supports a **simulation mode** for development where all operations
 * produce deterministic SHA-256 hashes and mock transaction IDs without
 * requiring a running Fabric network.
 */

import * as crypto from 'crypto';
import { FabricClient, computeHash, type TransactionResult } from './fabric-client';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CHANNEL_NAME = process.env.FABRIC_CHANNEL || 'smartseedchannel';
const CHAINCODE_NAME = process.env.FABRIC_CHAINCODE || 'smartseed';
const SIMULATION = process.env.BLOCKCHAIN_SIMULATION !== 'false'; // default true

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockchainRecord {
  txId: string;
  recordHash: string;
  timestamp: string;
  status: 'committed' | 'simulated' | 'failed';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class BlockchainService {
  private client: FabricClient;
  private simulation: boolean;

  constructor() {
    this.client = new FabricClient();
    this.simulation = SIMULATION;
    console.log(`[BlockchainService] Mode: ${this.simulation ? 'SIMULATION' : 'PRODUCTION'}`);
  }

  // -----------------------------------------------------------------------
  // Product operations
  // -----------------------------------------------------------------------

  async registerProduct(data: {
    productId: string;
    tenantId: string;
    name: string;
    brandName: string;
    cropType: string;
    seedVariety: string;
  }): Promise<BlockchainRecord> {
    const recordHash = computeHash(data as any);
    return this.submitOrSimulate('RegisterProduct', [
      data.productId, data.tenantId, data.name,
      data.brandName, data.cropType, data.seedVariety, recordHash,
    ], recordHash);
  }

  // -----------------------------------------------------------------------
  // Batch operations
  // -----------------------------------------------------------------------

  async registerBatch(data: {
    batchId: string;
    productId: string;
    tenantId: string;
    batchNumber: string;
    manufacturingDate: string;
    expiryDate: string;
    quantity: number;
  }): Promise<BlockchainRecord> {
    const recordHash = computeHash(data as any);
    return this.submitOrSimulate('RegisterBatch', [
      data.batchId, data.productId, data.tenantId, data.batchNumber,
      data.manufacturingDate, data.expiryDate, String(data.quantity), recordHash,
    ], recordHash);
  }

  async updateBatchStatus(batchId: string, status: string): Promise<BlockchainRecord> {
    const recordHash = computeHash({ batchId, status, timestamp: new Date().toISOString() } as any);
    return this.submitOrSimulate('UpdateBatchStatus', [batchId, status, recordHash], recordHash);
  }

  // -----------------------------------------------------------------------
  // Transfer operations
  // -----------------------------------------------------------------------

  async recordTransfer(data: {
    transferId: string;
    batchId: string;
    tenantId: string;
    senderId: string;
    senderRole: string;
    receiverId: string;
    receiverRole: string;
    quantity: number;
  }): Promise<BlockchainRecord> {
    const recordHash = computeHash(data as any);
    return this.submitOrSimulate('RecordTransfer', [
      data.transferId, data.batchId, data.tenantId,
      data.senderId, data.senderRole, data.receiverId, data.receiverRole,
      String(data.quantity), recordHash,
    ], recordHash);
  }

  async acceptTransfer(transferId: string): Promise<BlockchainRecord> {
    const recordHash = computeHash({ transferId, action: 'accept', timestamp: new Date().toISOString() } as any);
    return this.submitOrSimulate('AcceptTransfer', [transferId, recordHash], recordHash);
  }

  async rejectTransfer(transferId: string, reason: string): Promise<BlockchainRecord> {
    const recordHash = computeHash({ transferId, reason, timestamp: new Date().toISOString() } as any);
    return this.submitOrSimulate('RejectTransfer', [transferId, reason, recordHash], recordHash);
  }

  // -----------------------------------------------------------------------
  // Verification operations
  // -----------------------------------------------------------------------

  async recordVerification(data: {
    verificationId: string;
    batchId: string;
    tenantId: string;
    verifiedBy: string;
    location: string;
    result: string;
  }): Promise<BlockchainRecord> {
    const recordHash = computeHash(data as any);
    return this.submitOrSimulate('RecordVerification', [
      data.verificationId, data.batchId, data.tenantId,
      data.verifiedBy, data.location, data.result, recordHash,
    ], recordHash);
  }

  // -----------------------------------------------------------------------
  // Counterfeit report operations
  // -----------------------------------------------------------------------

  async recordCounterfeitReport(data: {
    reportId: string;
    batchId: string;
    tenantId: string;
    reportedBy: string;
    reason: string;
  }): Promise<BlockchainRecord> {
    const recordHash = computeHash(data as any);
    return this.submitOrSimulate('RecordCounterfeitReport', [
      data.reportId, data.batchId, data.tenantId,
      data.reportedBy, data.reason, recordHash,
    ], recordHash);
  }

  // -----------------------------------------------------------------------
  // Query operations
  // -----------------------------------------------------------------------

  async getBatchProvenance(batchId: string): Promise<any> {
    if (this.simulation) {
      return {
        batch: { batchId, status: 'simulated' },
        transfers: [],
        verifications: [],
        reports: [],
        note: 'Blockchain is in simulation mode',
      };
    }
    const result = await this.client.evaluateTransaction(
      CHANNEL_NAME, CHAINCODE_NAME, 'GetBatchProvenance', batchId,
    );
    return JSON.parse(result.payload);
  }

  async getBatchHistory(batchId: string): Promise<any[]> {
    if (this.simulation) {
      return [{
        txId: this.generateSimTxId(),
        timestamp: new Date().toISOString(),
        isDelete: false,
        value: { batchId, status: 'simulated' },
      }];
    }
    const result = await this.client.evaluateTransaction(
      CHANNEL_NAME, CHAINCODE_NAME, 'GetBatchHistory', batchId,
    );
    return JSON.parse(result.payload);
  }

  async getProduct(productId: string): Promise<any> {
    if (this.simulation) {
      return { productId, status: 'simulated' };
    }
    const result = await this.client.evaluateTransaction(
      CHANNEL_NAME, CHAINCODE_NAME, 'GetProduct', productId,
    );
    return JSON.parse(result.payload);
  }

  async getBatch(batchId: string): Promise<any> {
    if (this.simulation) {
      return { batchId, status: 'simulated' };
    }
    const result = await this.client.evaluateTransaction(
      CHANNEL_NAME, CHAINCODE_NAME, 'GetBatch', batchId,
    );
    return JSON.parse(result.payload);
  }

  async getTransfer(transferId: string): Promise<any> {
    if (this.simulation) {
      return { transferId, status: 'simulated' };
    }
    const result = await this.client.evaluateTransaction(
      CHANNEL_NAME, CHAINCODE_NAME, 'GetTransfer', transferId,
    );
    return JSON.parse(result.payload);
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /**
   * Submit a real transaction or produce a simulation result.
   */
  private async submitOrSimulate(
    functionName: string,
    args: string[],
    recordHash: string,
  ): Promise<BlockchainRecord> {
    if (this.simulation) {
      return {
        txId: this.generateSimTxId(),
        recordHash,
        timestamp: new Date().toISOString(),
        status: 'simulated',
      };
    }

    try {
      const result: TransactionResult = await this.client.submitTransaction(
        CHANNEL_NAME, CHAINCODE_NAME, functionName, ...args,
      );

      return {
        txId: result.txId,
        recordHash,
        timestamp: new Date().toISOString(),
        status: result.status === 'SUCCESS' ? 'committed' : 'failed',
      };
    } catch (error: any) {
      console.error(`[BlockchainService] ${functionName} failed:`, error.message);
      return {
        txId: `error-${Date.now()}`,
        recordHash,
        timestamp: new Date().toISOString(),
        status: 'failed',
      };
    }
  }

  /**
   * Generate a deterministic simulation transaction ID.
   */
  private generateSimTxId(): string {
    const random = crypto.randomBytes(16).toString('hex');
    return `sim-${random}`;
  }

  /**
   * Check whether the service is running in simulation mode.
   */
  isSimulation(): boolean {
    return this.simulation;
  }
}

// Default export singleton
export const blockchainService = new BlockchainService();

