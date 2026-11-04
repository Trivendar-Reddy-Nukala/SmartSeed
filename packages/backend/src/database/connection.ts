// ============================================================
// Database Connection Manager
// ============================================================

import knex, { Knex } from 'knex';
import knexConfig from './knexfile';
import logger from '../config/logger';

let db: Knex;

export function getDb(): Knex {
  if (!db) {
    db = knex(knexConfig);
  }
  return db;
}

/**
 * Set the current tenant context on a database connection.
 * Used by PostgreSQL RLS policies for row-level tenant isolation.
 */
export async function setTenantContext(trx: Knex | Knex.Transaction, tenantId: string): Promise<void> {
  await trx.raw(`SET LOCAL app.current_tenant = ?`, [tenantId]);
}

/**
 * Test the database connection
 */
export async function testConnection(): Promise<void> {
  try {
    await getDb().raw('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
}

/**
 * Close the database connection
 */
export async function closeConnection(): Promise<void> {
  if (db) {
    await db.destroy();
    logger.info('Database connection closed');
  }
}

export default getDb;

