/*
# SmartWarranty — Core Schema

## Overview
Creates the full data model for SmartWarranty, an AI warranty & repair agent with
persistent product memory. Single-tenant demo app (no auth), so all policies use
`TO anon, authenticated`.

## New Tables
- products: registered appliances with OCR data + warranty dates
- product_interactions: the memory stream (problems, troubleshooting, repairs, chats)
- memory_events: RETAIN / RECALL / REFLECT structured events
- warranty_claims: structured claim summaries
- notifications: context-aware reminders

## Security
- RLS enabled on every table
- All policies TO anon, authenticated (intentionally public/shared single-tenant demo)
*/

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL DEFAULT 'Appliance',
  model_number text,
  serial_number text,
  purchase_date date,
  warranty_duration_months integer DEFAULT 12,
  warranty_expiry date,
  seller text,
  image_url text,
  warranty_status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

-- Product interactions
CREATE TABLE IF NOT EXISTS product_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'conversation',
  summary text NOT NULL,
  detail text,
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_interactions" ON product_interactions;
CREATE POLICY "anon_select_interactions" ON product_interactions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_interactions" ON product_interactions;
CREATE POLICY "anon_insert_interactions" ON product_interactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_interactions" ON product_interactions;
CREATE POLICY "anon_update_interactions" ON product_interactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_interactions" ON product_interactions;
CREATE POLICY "anon_delete_interactions" ON product_interactions FOR DELETE
  TO anon, authenticated USING (true);

-- Memory events
CREATE TABLE IF NOT EXISTS memory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  layer text NOT NULL DEFAULT 'RETAIN',
  label text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_memory_events" ON memory_events;
CREATE POLICY "anon_select_memory_events" ON memory_events FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_memory_events" ON memory_events;
CREATE POLICY "anon_insert_memory_events" ON memory_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_memory_events" ON memory_events;
CREATE POLICY "anon_delete_memory_events" ON memory_events FOR DELETE
  TO anon, authenticated USING (true);

-- Warranty claims
CREATE TABLE IF NOT EXISTS warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  issue text NOT NULL,
  warranty_status text,
  issue_recurrence integer DEFAULT 0,
  previous_repairs text,
  documents_required text,
  claim_summary text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_claims" ON warranty_claims;
CREATE POLICY "anon_select_claims" ON warranty_claims FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_claims" ON warranty_claims;
CREATE POLICY "anon_insert_claims" ON warranty_claims FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_claims" ON warranty_claims;
CREATE POLICY "anon_delete_claims" ON warranty_claims FOR DELETE
  TO anon, authenticated USING (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text DEFAULT 'reminder',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interactions_product ON product_interactions(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memory_product ON memory_events(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_claims_product ON warranty_claims(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_product ON notifications(product_id);
