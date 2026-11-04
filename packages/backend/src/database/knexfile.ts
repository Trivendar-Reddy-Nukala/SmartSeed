// ============================================================
// Knex Configuration
// ============================================================

import type { Knex } from 'knex';
import { config } from '../config';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  },
  pool: { min: 2, max: 20 },
  migrations: {
    directory: __dirname + '/migrations',
    tableName: 'knex_migrations',
    extension: 'ts',
  },
  seeds: {
    directory: __dirname + '/seeds',
    extension: 'ts',
  },
};

export default knexConfig;

