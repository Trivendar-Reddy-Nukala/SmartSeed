import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('retail_sales', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').notNullable();
    t.uuid('retailer_id').references('id').inTable('users').onDelete('RESTRICT').notNullable();
    t.uuid('batch_id').references('id').inTable('seed_batches').onDelete('RESTRICT').notNullable();
    t.string('farmer_name', 255).notNullable();
    t.string('farmer_passbook_number', 100).notNullable();
    t.string('farmer_phone', 50);
    t.string('farmer_village', 255);
    t.integer('quantity').notNullable().checkPositive();
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('total_price', 12, 2).notNullable();
    t.string('payment_method', 50).defaultTo('cash').notNullable();
    t.string('receipt_number', 100).unique().notNullable();
    t.text('notes');
    t.string('blockchain_tx_id', 255);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    t.index(['tenant_id', 'retailer_id']);
    t.index(['farmer_passbook_number']);
    t.index(['batch_id']);
    t.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('retail_sales');
}

