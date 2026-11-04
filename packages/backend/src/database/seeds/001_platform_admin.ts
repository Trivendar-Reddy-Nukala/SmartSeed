// ============================================================
// Database Seed: Platform Admin + Demo Tenant
// ============================================================

import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Clean existing seed data
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('alerts').del();
  await knex('investigations').del();
  await knex('risk_scores').del();
  await knex('anomaly_predictions').del();
  await knex('qr_scans').del();
  await knex('qr_codes').del();
  await knex('supply_chain_events').del();
  await knex('shipments').del();
  await knex('transfers').del();
  await knex('inventory').del();
  await knex('seed_batches').del();
  await knex('products').del();
  await knex('subscriptions').del();
  await knex('certifications').del();
  await knex('blockchain_transactions').del();
  await knex('refresh_tokens').del();
  await knex('users').del();
  await knex('tenants').del();

  const adminPasswordHash = await bcrypt.hash('SmartSeed@Admin2026', 12);
  const mfgPasswordHash = await bcrypt.hash('Manufacturer@2026', 12);
  const distPasswordHash = await bcrypt.hash('Distributor@2026', 12);
  const retailPasswordHash = await bcrypt.hash('Retailer@2026', 12);

  // Platform admin (no tenant)
  const [adminUser] = await knex('users').insert({
    email: 'admin@smartseed.io',
    password_hash: adminPasswordHash,
    first_name: 'Platform',
    last_name: 'Admin',
    role: 'platform_admin',
    is_active: true,
    email_verified: true,
  }).returning('id');

  // Demo tenant: GreenGrow Seeds
  const [tenant] = await knex('tenants').insert({
    name: 'GreenGrow Seeds',
    slug: 'greengrow',
    status: 'active',
    subscription_plan: 'professional',
    contact_email: 'info@greengrow.example',
    contact_phone: '+91-9876543210',
    address: 'Hyderabad, Telangana, India',
  }).returning('*');

  // Manufacturer user
  const [mfgUser] = await knex('users').insert({
    tenant_id: tenant.id,
    email: 'manufacturer@greengrow.example',
    password_hash: mfgPasswordHash,
    first_name: 'Ravi',
    last_name: 'Kumar',
    role: 'manufacturer',
    is_active: true,
    email_verified: true,
  }).returning('id');

  // Distributor user
  const [distUser] = await knex('users').insert({
    tenant_id: tenant.id,
    email: 'distributor@greengrow.example',
    password_hash: distPasswordHash,
    first_name: 'Suresh',
    last_name: 'Reddy',
    role: 'distributor',
    is_active: true,
    email_verified: true,
  }).returning('id');

  // Retailer user
  const [retailUser] = await knex('users').insert({
    tenant_id: tenant.id,
    email: 'retailer@greengrow.example',
    password_hash: retailPasswordHash,
    first_name: 'Lakshmi',
    last_name: 'Devi',
    role: 'retailer',
    is_active: true,
    email_verified: true,
  }).returning('id');

  // Subscription for demo tenant
  await knex('subscriptions').insert({
    tenant_id: tenant.id,
    plan: 'professional',
    status: 'active',
    max_users: 50,
    max_batches_per_month: 500,
    max_qr_codes: 50000,
    features: JSON.stringify({
      ai_detection: true,
      blockchain: true,
      investigations: true,
      api_access: true,
    }),
  });

  // Demo product
  const [product] = await knex('products').insert({
    tenant_id: tenant.id,
    name: 'GreenGrow Hybrid Paddy Seeds BPT-5204',
    brand_name: 'GreenGrow',
    crop_type: 'Paddy',
    seed_variety: 'BPT-5204 (Samba Mahsuri)',
    description: 'High-yielding paddy seed variety suitable for Kharif and Rabi seasons. Medium duration, fine grain quality.',
    category: 'Certified Seeds',
    packaging_info: '2kg pack, moisture-proof packaging',
    regulatory_ids: JSON.stringify({ seed_license: 'SLIC/TS/2026/1234', lot_number: 'LOT-2026-001' }),
    certifications: ['ICAR Certified', 'State Seed Certification Agency'],
    is_active: true,
  }).returning('*');

  // Demo batch
  const [batch] = await knex('seed_batches').insert({
    tenant_id: tenant.id,
    product_id: product.id,
    batch_number: 'GG-BPT5204-2026-001',
    manufacturing_date: '2026-09-01',
    expiry_date: '2027-09-01',
    production_location: 'Hyderabad, Telangana',
    manufacturing_facility: 'GreenGrow Processing Unit #1',
    initial_quantity: 10000,
    current_quantity: 10000,
    unit_of_measurement: 'packets',
    status: 'in_inventory',
  }).returning('*');

  // Inventory record for manufacturer
  await knex('inventory').insert({
    tenant_id: tenant.id,
    batch_id: batch.id,
    holder_id: mfgUser.id,
    holder_role: 'manufacturer',
    quantity: 10000,
    location: 'Hyderabad, Telangana',
  });

  // Supply chain event for manufacturing
  await knex('supply_chain_events').insert({
    tenant_id: tenant.id,
    batch_id: batch.id,
    event_type: 'manufactured',
    actor_id: mfgUser.id,
    actor_role: 'manufacturer',
    source_location: 'Hyderabad, Telangana',
    quantity: 10000,
    metadata: JSON.stringify({ facility: 'GreenGrow Processing Unit #1' }),
  });

  console.log('✅ Seed data created successfully');
  console.log('   Platform Admin: admin@smartseed.io / SmartSeed@Admin2026');
  console.log('   Manufacturer: manufacturer@greengrow.example / Manufacturer@2026');
  console.log('   Distributor: distributor@greengrow.example / Distributor@2026');
  console.log('   Retailer: retailer@greengrow.example / Retailer@2026');
}

