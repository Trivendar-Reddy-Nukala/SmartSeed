// ============================================================
// Initial Database Schema Migration
// Complete schema for SmartSeed platform
// ============================================================

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

  // ---- tenants ----
  await knex.schema.createTable('tenants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.string('slug', 100).unique().notNullable();
    t.string('status', 50).defaultTo('pending').notNullable();
    t.string('subscription_plan', 50).defaultTo('starter').notNullable();
    t.string('contact_email', 255).notNullable();
    t.string('contact_phone', 50);
    t.text('address');
    t.text('logo_url');
    t.jsonb('settings').defaultTo('{}');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // ---- users ----
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.string('email', 255).unique().notNullable();
    t.string('password_hash', 255).notNullable();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.string('role', 50).notNullable();
    t.boolean('is_active').defaultTo(true);
    t.boolean('email_verified').defaultTo(false);
    t.boolean('mfa_enabled').defaultTo(false);
    t.string('phone', 50);
    t.text('avatar_url');
    t.timestamp('last_login_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id']);
    t.index(['role']);
  });

  // ---- refresh_tokens ----
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.string('token_hash', 255).notNullable();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.boolean('revoked').defaultTo(false);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['user_id']);
    t.index(['token_hash']);
  });

  // ---- products ----
  await knex.schema.createTable('products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.string('name', 255).notNullable();
    t.string('brand_name', 255).notNullable();
    t.string('crop_type', 100).notNullable();
    t.string('seed_variety', 100).notNullable();
    t.text('description');
    t.string('category', 100);
    t.text('packaging_info');
    t.jsonb('regulatory_ids').defaultTo('{}');
    t.specificType('certifications', 'text[]').defaultTo('{}');
    t.text('image_url');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id']);
    t.index(['crop_type']);
  });

  // ---- seed_batches ----
  await knex.schema.createTable('seed_batches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('product_id').references('id').inTable('products').onDelete('RESTRICT').notNullable();
    t.string('batch_number', 100).notNullable();
    t.date('manufacturing_date').notNullable();
    t.date('expiry_date').notNullable();
    t.string('production_location', 255).notNullable();
    t.string('manufacturing_facility', 255);
    t.integer('initial_quantity').notNullable().checkPositive();
    t.integer('current_quantity').notNullable().defaultTo(0);
    t.string('unit_of_measurement', 50).notNullable().defaultTo('packets');
    t.string('status', 50).defaultTo('created').notNullable();
    t.specificType('certification_doc_urls', 'text[]').defaultTo('{}');
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'batch_number']);
    t.index(['tenant_id', 'status']);
    t.index(['product_id']);
  });

  // ---- inventory ----
  await knex.schema.createTable('inventory', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('CASCADE').notNullable();
    t.uuid('holder_id').references('id').inTable('users').onDelete('RESTRICT').notNullable();
    t.string('holder_role', 50).notNullable();
    t.integer('quantity').notNullable().defaultTo(0);
    t.string('location', 255);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['tenant_id', 'batch_id', 'holder_id']);
    t.index(['holder_id']);
  });

  // ---- transfers ----
  await knex.schema.createTable('transfers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('RESTRICT').notNullable();
    t.uuid('sender_id').references('id').inTable('users').onDelete('RESTRICT').notNullable();
    t.string('sender_role', 50).notNullable();
    t.uuid('receiver_id').references('id').inTable('users').onDelete('RESTRICT').notNullable();
    t.string('receiver_role', 50).notNullable();
    t.integer('quantity').notNullable().checkPositive();
    t.string('status', 50).defaultTo('initiated').notNullable();
    t.string('source_location', 255);
    t.string('destination_location', 255);
    t.timestamp('dispatch_date', { useTz: true });
    t.timestamp('receive_date', { useTz: true });
    t.string('blockchain_tx_id', 255);
    t.text('notes');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id', 'batch_id']);
    t.index(['sender_id']);
    t.index(['receiver_id']);
    t.index(['status']);
  });

  // ---- shipments ----
  await knex.schema.createTable('shipments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('transfer_id').references('id').inTable('transfers').onDelete('CASCADE').notNullable();
    t.string('tracking_number', 255);
    t.string('carrier', 255);
    t.string('status', 50).defaultTo('created').notNullable();
    t.timestamp('estimated_delivery', { useTz: true });
    t.timestamp('actual_delivery', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // ---- supply_chain_events ----
  await knex.schema.createTable('supply_chain_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('CASCADE').notNullable();
    t.string('event_type', 50).notNullable();
    t.uuid('actor_id').references('id').inTable('users').onDelete('RESTRICT').notNullable();
    t.string('actor_role', 50).notNullable();
    t.string('source_location', 255);
    t.string('destination_location', 255);
    t.integer('quantity');
    t.uuid('transfer_id').references('id').inTable('transfers').onDelete('SET NULL');
    t.string('blockchain_tx_id', 255);
    t.string('record_hash', 255);
    t.jsonb('metadata').defaultTo('{}');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id', 'batch_id']);
    t.index(['event_type']);
    t.index(['created_at']);
  });

  // ---- qr_codes ----
  await knex.schema.createTable('qr_codes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('CASCADE').notNullable();
    t.string('package_id', 255);
    t.string('public_token', 255).unique().notNullable();
    t.text('qr_data').notNullable();
    t.string('status', 50).defaultTo('active').notNullable();
    t.integer('scan_count').defaultTo(0);
    t.timestamp('last_scanned_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['public_token']);
    t.index(['tenant_id', 'batch_id']);
  });

  // ---- qr_scans ----
  await knex.schema.createTable('qr_scans', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('qr_code_id').references('id').inTable('qr_codes').onDelete('CASCADE').notNullable();
    t.uuid('scanned_by').references('id').inTable('users').onDelete('SET NULL');
    t.decimal('latitude', 10, 8);
    t.decimal('longitude', 11, 8);
    t.string('ip_address', 45);
    t.text('user_agent');
    t.string('scan_result', 50).notNullable().defaultTo('valid');
    t.timestamp('scanned_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['qr_code_id']);
    t.index(['scanned_at']);
  });

  // ---- blockchain_transactions ----
  await knex.schema.createTable('blockchain_transactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('SET NULL');
    t.string('tx_id', 255).unique().notNullable();
    t.string('channel_name', 100).notNullable();
    t.string('chaincode_name', 100).notNullable();
    t.string('function_name', 100).notNullable();
    t.jsonb('args').defaultTo('[]');
    t.string('record_hash', 255).notNullable();
    t.string('status', 50).defaultTo('submitted').notNullable();
    t.bigInteger('block_number');
    t.timestamp('timestamp', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id']);
    t.index(['tx_id']);
    t.index(['batch_id']);
  });

  // ---- anomaly_predictions ----
  await knex.schema.createTable('anomaly_predictions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('CASCADE').notNullable();
    t.string('anomaly_type', 100).notNullable();
    t.string('severity', 50).notNullable();
    t.decimal('confidence', 5, 4).notNullable();
    t.jsonb('features').defaultTo('{}');
    t.string('model_name', 100).notNullable();
    t.string('model_version', 50).notNullable();
    t.text('description');
    t.text('recommended_action');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id', 'batch_id']);
    t.index(['severity']);
  });

  // ---- risk_scores ----
  await knex.schema.createTable('risk_scores', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('CASCADE').notNullable();
    t.integer('score').notNullable();
    t.string('risk_level', 50).notNullable();
    t.jsonb('indicators').defaultTo('[]');
    t.string('model_version', 50);
    t.timestamp('calculated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id', 'batch_id']);
    t.index(['risk_level']);
  });

  // ---- investigations ----
  await knex.schema.createTable('investigations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('CASCADE').notNullable();
    t.uuid('alert_id');
    t.string('status', 50).defaultTo('opened').notNullable();
    t.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    t.integer('risk_score');
    t.string('risk_category', 50);
    t.text('main_suspicious_activity');
    t.jsonb('supporting_evidence').defaultTo('[]');
    t.text('potential_explanation');
    t.specificType('recommended_steps', 'text[]').defaultTo('{}');
    t.text('resolution');
    t.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('resolved_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id', 'status']);
  });

  // ---- alerts ----
  await knex.schema.createTable('alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('CASCADE').notNullable();
    t.string('alert_type', 50).notNullable();
    t.string('severity', 50).notNullable();
    t.integer('risk_score');
    t.string('title', 500).notNullable();
    t.text('description');
    t.uuid('investigation_id').references('id').inTable('investigations').onDelete('SET NULL');
    t.string('investigation_status', 50);
    t.timestamp('resolved_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id', 'severity']);
    t.index(['alert_type']);
    t.index(['created_at']);
  });

  // ---- notifications ----
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    t.string('type', 50).notNullable().defaultTo('in_app');
    t.string('title', 500).notNullable();
    t.text('message').notNullable();
    t.jsonb('data').defaultTo('{}');
    t.boolean('is_read').defaultTo(false);
    t.timestamp('read_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['user_id', 'is_read']);
  });

  // ---- audit_logs ----
  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 100).notNullable();
    t.string('entity_type', 100).notNullable();
    t.string('entity_id', 255).notNullable();
    t.jsonb('old_values');
    t.jsonb('new_values');
    t.string('ip_address', 45);
    t.text('user_agent');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id']);
    t.index(['entity_type', 'entity_id']);
    t.index(['user_id']);
    t.index(['created_at']);
  });

  // ---- subscriptions ----
  await knex.schema.createTable('subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.string('plan', 50).notNullable();
    t.string('status', 50).defaultTo('active').notNullable();
    t.integer('max_users').defaultTo(10);
    t.integer('max_batches_per_month').defaultTo(100);
    t.integer('max_qr_codes').defaultTo(10000);
    t.jsonb('features').defaultTo('{}');
    t.timestamp('started_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('expires_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // ---- certifications ----
  await knex.schema.createTable('certifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('SET NULL');
    t.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');
    t.string('name', 255).notNullable();
    t.string('issuing_authority', 255);
    t.string('certificate_number', 255);
    t.date('issue_date');
    t.date('expiry_date');
    t.text('document_url');
    t.boolean('verified').defaultTo(false);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.index(['tenant_id']);
  });

  // ---- Row Level Security ----
  // Enable RLS on tenant-scoped tables
  const rlsTables = [
    'products', 'seed_batches', 'inventory', 'transfers', 'shipments',
    'supply_chain_events', 'qr_codes', 'blockchain_transactions',
    'anomaly_predictions', 'risk_scores', 'investigations', 'alerts',
    'notifications', 'subscriptions', 'certifications',
  ];

  for (const table of rlsTables) {
    await knex.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation_${table} ON "${table}"
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);
    // Allow superuser/app to bypass RLS
    await knex.raw(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'certifications', 'subscriptions', 'audit_logs', 'notifications',
    'alerts', 'investigations', 'risk_scores', 'anomaly_predictions',
    'blockchain_transactions', 'qr_scans', 'qr_codes', 'supply_chain_events',
    'shipments', 'transfers', 'inventory', 'seed_batches', 'products',
    'refresh_tokens', 'users', 'tenants',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}

