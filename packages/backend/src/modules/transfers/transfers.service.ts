// ============================================================
// Transfers Service — Critical inventory validation logic
// ============================================================

import { getDb } from '../../database/connection';
import { AppError } from '../../middleware/errorHandler';
import { blockchainService } from '../blockchain/blockchain.service';
import type { CreateTransferInput } from './transfers.validation';

export class TransfersService {
  async list(tenantId: string, page = 1, pageSize = 20, status?: string, batchId?: string) {
    const db = getDb();
    let query = db('transfers')
      .where({ 'transfers.tenant_id': tenantId })
      .leftJoin('seed_batches', 'transfers.batch_id', 'seed_batches.id')
      .leftJoin('users as sender', 'transfers.sender_id', 'sender.id')
      .leftJoin('users as receiver', 'transfers.receiver_id', 'receiver.id')
      .orderBy('transfers.created_at', 'desc');

    if (status) query = query.where('transfers.status', status);
    if (batchId) query = query.where('transfers.batch_id', batchId);

    const countResult = await query.clone().count('transfers.id as count').first();
    const totalCount = parseInt(countResult?.count as string || '0', 10);

    const transfers = await query
      .select(
        'transfers.*',
        'seed_batches.batch_number',
        'sender.first_name as sender_first_name', 'sender.last_name as sender_last_name',
        'receiver.first_name as receiver_first_name', 'receiver.last_name as receiver_last_name',
      )
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return { data: transfers, meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) } };
  }

  async getById(id: string, tenantId: string) {
    const db = getDb();
    const transfer = await db('transfers')
      .where({ 'transfers.id': id, 'transfers.tenant_id': tenantId })
      .leftJoin('seed_batches', 'transfers.batch_id', 'seed_batches.id')
      .leftJoin('users as sender', 'transfers.sender_id', 'sender.id')
      .leftJoin('users as receiver', 'transfers.receiver_id', 'receiver.id')
      .select(
        'transfers.*',
        'seed_batches.batch_number', 'seed_batches.product_id',
        'sender.first_name as sender_first_name', 'sender.last_name as sender_last_name', 'sender.email as sender_email',
        'receiver.first_name as receiver_first_name', 'receiver.last_name as receiver_last_name', 'receiver.email as receiver_email',
      )
      .first();
    if (!transfer) throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    return transfer;
  }

  /**
   * Initiate a transfer. Critical business logic:
   * 1. Validate sender owns the batch (has inventory)
   * 2. Validate sender has sufficient quantity
   * 3. Validate receiver exists and belongs to tenant
   * 4. Validate batch is not expired
   * 5. Create transfer record
   * 6. Record blockchain transaction
   */
  async create(tenantId: string, senderId: string, senderRole: string, input: CreateTransferInput) {
    const db = getDb();

    return await db.transaction(async (trx) => {
      // 1. Verify batch exists and belongs to tenant
      const batch = await trx('seed_batches')
        .where({ id: input.batchId, tenant_id: tenantId })
        .first();
      if (!batch) throw new AppError('Batch not found', 404, 'BATCH_NOT_FOUND');

      // 2. Check batch is not expired
      if (new Date(batch.expiry_date) < new Date()) {
        throw new AppError('Cannot transfer expired batch', 400, 'BATCH_EXPIRED');
      }

      // 3. Check batch status allows transfers
      if (['expired', 'recalled', 'under_investigation'].includes(batch.status)) {
        throw new AppError(`Cannot transfer batch with status: ${batch.status}`, 400, 'INVALID_BATCH_STATUS');
      }

      // 4. Verify sender has sufficient inventory
      const senderInventory = await trx('inventory')
        .where({ batch_id: input.batchId, holder_id: senderId, tenant_id: tenantId })
        .first();

      if (!senderInventory || senderInventory.quantity < input.quantity) {
        throw new AppError(
          `Insufficient inventory. Available: ${senderInventory?.quantity || 0}, Requested: ${input.quantity}`,
          400,
          'INSUFFICIENT_INVENTORY',
        );
      }

      // 5. Verify receiver exists and belongs to tenant
      const receiver = await trx('users')
        .where({ id: input.receiverId, tenant_id: tenantId, is_active: true })
        .first();
      if (!receiver) throw new AppError('Receiver not found', 404, 'RECEIVER_NOT_FOUND');

      // 6. Prevent self-transfer
      if (senderId === input.receiverId) {
        throw new AppError('Cannot transfer to yourself', 400, 'SELF_TRANSFER');
      }

      // 7. Create transfer record
      const [transfer] = await trx('transfers').insert({
        tenant_id: tenantId,
        batch_id: input.batchId,
        sender_id: senderId,
        sender_role: senderRole,
        receiver_id: input.receiverId,
        receiver_role: receiver.role,
        quantity: input.quantity,
        status: 'initiated',
        source_location: input.sourceLocation,
        destination_location: input.destinationLocation,
        notes: input.notes,
      }).returning('*');

      // 8. Record blockchain transaction
      const txId = await blockchainService.transferBatch(
        transfer.id, input.batchId, senderId, input.receiverId, input.quantity,
        { transferId: transfer.id, quantity: input.quantity, timestamp: new Date().toISOString() },
      );

      await trx('transfers').where({ id: transfer.id }).update({ blockchain_tx_id: txId });

      // 9. Create supply chain event
      await trx('supply_chain_events').insert({
        tenant_id: tenantId,
        batch_id: input.batchId,
        event_type: 'dispatched',
        actor_id: senderId,
        actor_role: senderRole,
        source_location: input.sourceLocation,
        destination_location: input.destinationLocation,
        quantity: input.quantity,
        transfer_id: transfer.id,
        blockchain_tx_id: txId,
        record_hash: blockchainService.computeHash({ transferId: transfer.id, quantity: input.quantity }),
      });

      // 10. Deduct from sender inventory
      const newSenderQty = senderInventory.quantity - input.quantity;
      await trx('inventory')
        .where({ id: senderInventory.id })
        .update({ quantity: newSenderQty, updated_at: new Date() });

      // 11. Update batch status
      const totalRemaining = await trx('inventory')
        .where({ batch_id: input.batchId, tenant_id: tenantId })
        .sum('quantity as total')
        .first();
      const remaining = parseInt(totalRemaining?.total as string || '0', 10);

      let newBatchStatus = batch.status;
      if (remaining === 0) newBatchStatus = 'fully_dispatched';
      else if (remaining < batch.initial_quantity) newBatchStatus = 'partially_dispatched';

      await trx('seed_batches')
        .where({ id: input.batchId })
        .update({ current_quantity: remaining, status: newBatchStatus, updated_at: new Date() });

      transfer.blockchain_tx_id = txId;
      return transfer;
    });
  }

  /**
   * Dispatch a transfer (update status to dispatched)
   */
  async dispatch(id: string, tenantId: string, userId: string) {
    const db = getDb();
    const transfer = await db('transfers').where({ id, tenant_id: tenantId }).first();
    if (!transfer) throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    if (transfer.sender_id !== userId) throw new AppError('Only sender can dispatch', 403, 'FORBIDDEN');
    if (transfer.status !== 'initiated') throw new AppError('Transfer must be in initiated status', 400, 'INVALID_STATUS');

    const [updated] = await db('transfers')
      .where({ id })
      .update({ status: 'dispatched', dispatch_date: new Date(), updated_at: new Date() })
      .returning('*');
    return updated;
  }

  /**
   * Receive a transfer — adds to receiver inventory
   */
  async receive(id: string, tenantId: string, userId: string) {
    const db = getDb();

    return await db.transaction(async (trx) => {
      const transfer = await trx('transfers').where({ id, tenant_id: tenantId }).first();
      if (!transfer) throw new AppError('Transfer not found', 404, 'NOT_FOUND');
      if (transfer.receiver_id !== userId) throw new AppError('Only receiver can accept', 403, 'FORBIDDEN');
      if (!['initiated', 'dispatched', 'in_transit'].includes(transfer.status)) {
        throw new AppError('Transfer cannot be received in current status', 400, 'INVALID_STATUS');
      }

      // Update transfer status
      const [updated] = await trx('transfers')
        .where({ id })
        .update({ status: 'received', receive_date: new Date(), updated_at: new Date() })
        .returning('*');

      // Add to receiver inventory (upsert)
      const existing = await trx('inventory')
        .where({ batch_id: transfer.batch_id, holder_id: userId, tenant_id: tenantId })
        .first();

      if (existing) {
        await trx('inventory')
          .where({ id: existing.id })
          .update({ quantity: existing.quantity + transfer.quantity, updated_at: new Date() });
      } else {
        const receiver = await trx('users').where({ id: userId }).first();
        await trx('inventory').insert({
          tenant_id: tenantId,
          batch_id: transfer.batch_id,
          holder_id: userId,
          holder_role: receiver.role,
          quantity: transfer.quantity,
          location: transfer.destination_location,
        });
      }

      // Supply chain event
      await trx('supply_chain_events').insert({
        tenant_id: tenantId,
        batch_id: transfer.batch_id,
        event_type: 'received',
        actor_id: userId,
        actor_role: transfer.receiver_role,
        source_location: transfer.source_location,
        destination_location: transfer.destination_location,
        quantity: transfer.quantity,
        transfer_id: id,
      });

      // Blockchain
      const txId = await blockchainService.acceptBatch(id);
      await trx('blockchain_transactions').insert({
        tenant_id: tenantId,
        batch_id: transfer.batch_id,
        tx_id: txId,
        channel_name: 'seedchannel',
        chaincode_name: 'smartseed',
        function_name: 'AcceptBatch',
        args: JSON.stringify([id]),
        record_hash: blockchainService.computeHash({ transferId: id, status: 'received' }),
        status: 'committed',
        timestamp: new Date(),
      });

      return updated;
    });
  }

  /**
   * Reject a transfer — returns quantity to sender
   */
  async reject(id: string, tenantId: string, userId: string, reason?: string) {
    const db = getDb();

    return await db.transaction(async (trx) => {
      const transfer = await trx('transfers').where({ id, tenant_id: tenantId }).first();
      if (!transfer) throw new AppError('Transfer not found', 404, 'NOT_FOUND');
      if (transfer.receiver_id !== userId) throw new AppError('Only receiver can reject', 403, 'FORBIDDEN');
      if (!['initiated', 'dispatched', 'in_transit'].includes(transfer.status)) {
        throw new AppError('Transfer cannot be rejected in current status', 400, 'INVALID_STATUS');
      }

      // Update transfer
      const [updated] = await trx('transfers')
        .where({ id })
        .update({ status: 'rejected', notes: reason || transfer.notes, updated_at: new Date() })
        .returning('*');

      // Return quantity to sender
      await trx('inventory')
        .where({ batch_id: transfer.batch_id, holder_id: transfer.sender_id, tenant_id: tenantId })
        .increment('quantity', transfer.quantity)
        .update({ updated_at: new Date() });

      // Update batch quantity
      await trx('seed_batches')
        .where({ id: transfer.batch_id })
        .increment('current_quantity', transfer.quantity)
        .update({ status: 'in_inventory', updated_at: new Date() });

      // Supply chain event
      await trx('supply_chain_events').insert({
        tenant_id: tenantId,
        batch_id: transfer.batch_id,
        event_type: 'rejected',
        actor_id: userId,
        actor_role: transfer.receiver_role,
        quantity: transfer.quantity,
        transfer_id: id,
        metadata: JSON.stringify({ reason }),
      });

      return updated;
    });
  }
}

export const transfersService = new TransfersService();

