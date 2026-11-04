/**
 * SmartSeed Blockchain — Fabric Gateway Client
 *
 * Low-level wrapper around the Hyperledger Fabric SDK that manages
 * wallet identities, gateway connections, and transaction submission.
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConnectionProfile {
  name: string;
  version: string;
  client: {
    organization: string;
    connection: { timeout: { peer: { endorser: string }; orderer: string } };
  };
  organizations: Record<string, { mspid: string; peers: string[]; certificateAuthorities?: string[] }>;
  peers: Record<string, { url: string; tlsCACerts?: { pem: string } }>;
  orderers: Record<string, { url: string; tlsCACerts?: { pem: string } }>;
}

export interface FabricIdentity {
  certificate: string;
  privateKey: string;
  mspId: string;
}

export interface TransactionResult {
  txId: string;
  payload: string;
  status: 'SUCCESS' | 'FAILED';
  blockNumber?: number;
}

// ---------------------------------------------------------------------------
// Fabric Client
// ---------------------------------------------------------------------------

/**
 * FabricClient manages the lifecycle of a Fabric gateway connection.
 *
 * In production it uses the `fabric-network` SDK.  During development
 * (when `BLOCKCHAIN_SIMULATION=true`) the BlockchainService layer above
 * this client bypasses it entirely, so this client is only instantiated
 * when connecting to a real Fabric network.
 */
export class FabricClient extends EventEmitter {
  private connected = false;
  private gateway: any = null;
  private identity: FabricIdentity | null = null;

  constructor() {
    super();
  }

  /**
   * Establish a gateway connection to the Fabric network.
   */
  async connect(profile: ConnectionProfile, identity: FabricIdentity): Promise<void> {
    try {
      // Dynamic import — fabric-network may not be installed in dev
      const { Gateway, Wallets } = await import('fabric-network');

      const wallet = await Wallets.newInMemoryWallet();
      await wallet.put('user', {
        credentials: {
          certificate: identity.certificate,
          privateKey: identity.privateKey,
        },
        mspId: identity.mspId,
        type: 'X.509',
      });

      this.gateway = new Gateway();
      await this.gateway.connect(profile as any, {
        wallet,
        identity: 'user',
        discovery: { enabled: true, asLocalhost: true },
      });

      this.identity = identity;
      this.connected = true;
      this.emit('connected');
      console.log('[FabricClient] Connected to Fabric network');
    } catch (error) {
      console.error('[FabricClient] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Close the gateway connection.
   */
  disconnect(): void {
    if (this.gateway) {
      this.gateway.disconnect();
      this.gateway = null;
    }
    this.connected = false;
    this.identity = null;
    this.emit('disconnected');
    console.log('[FabricClient] Disconnected');
  }

  /**
   * Submit a transaction (write operation).
   */
  async submitTransaction(
    channelName: string,
    chaincodeName: string,
    functionName: string,
    ...args: string[]
  ): Promise<TransactionResult> {
    this.ensureConnected();

    const network = await this.gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    const tx = contract.createTransaction(functionName);
    const txId = tx.getTransactionId();

    try {
      const result = await tx.submit(...args);
      return {
        txId,
        payload: result.toString(),
        status: 'SUCCESS',
      };
    } catch (error: any) {
      console.error(`[FabricClient] Transaction ${functionName} failed:`, error.message);
      return {
        txId,
        payload: error.message,
        status: 'FAILED',
      };
    }
  }

  /**
   * Evaluate a transaction (read-only query).
   */
  async evaluateTransaction(
    channelName: string,
    chaincodeName: string,
    functionName: string,
    ...args: string[]
  ): Promise<TransactionResult> {
    this.ensureConnected();

    const network = await this.gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    try {
      const result = await contract.evaluateTransaction(functionName, ...args);
      return {
        txId: `query-${Date.now()}`,
        payload: result.toString(),
        status: 'SUCCESS',
      };
    } catch (error: any) {
      console.error(`[FabricClient] Query ${functionName} failed:`, error.message);
      return {
        txId: `query-${Date.now()}`,
        payload: error.message,
        status: 'FAILED',
      };
    }
  }

  /**
   * Check connection status.
   */
  isConnected(): boolean {
    return this.connected;
  }

  private ensureConnected(): void {
    if (!this.connected || !this.gateway) {
      throw new Error('FabricClient is not connected. Call connect() first.');
    }
  }
}

// ---------------------------------------------------------------------------
// Hash Utility
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hash of the given data.
 */
export function computeHash(data: Record<string, unknown>): string {
  const json = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}

