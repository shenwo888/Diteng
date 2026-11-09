/*
# Create cloud tables for club management, orders and coupons

1. New Tables
- `customers`: customer accounts with prepaid balance.
- `companions`: companion (陪玩) profiles with service and gift commission rates.
- `staff`: customer service staff with commission rates.
- `services`: service items with hourly and half-hour prices.
- `service_tags`: surcharge tags that can be added to a service.
- `gift_items`: gift catalogue with default values.
- `coupons`: discount codes. Each has a kind (percent or fixed), a value, and the KOL it belongs to.
- `orders`: orders with their service lines and gifts stored as JSON lists, plus coupon details.
- `transactions`: prepaid balance movements (top-ups, spending, refunds).
- `payroll_archives`: archived weekly payroll snapshots.
- `app_settings`: key/value store for global settings such as currency.

2. Security
- Row level security is enabled on every table.
- This app has no sign-in screen, so every table grants SELECT, INSERT, UPDATE and DELETE to `anon` and `authenticated`, matching the existing single-tenant design.

3. Notes
- All statements are idempotent (IF NOT EXISTS and DROP POLICY IF EXISTS), so this migration is safe to re-run.
- Existing local browser data is not migrated by this file.
*/

CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact text NOT NULL DEFAULT '',
  balance numeric NOT NULL DEFAULT 0,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS companions (
  id text PRIMARY KEY,
  name text NOT NULL,
  service_rate numeric NOT NULL DEFAULT 70,
  gift_rate numeric NOT NULL DEFAULT 80,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS staff (
  id text PRIMARY KEY,
  name text NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_per_hour numeric NOT NULL DEFAULT 0,
  price_per_half_hour numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS service_tags (
  id text PRIMARY KEY,
  name text NOT NULL,
  surcharge numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gift_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  default_value numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coupons (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('percent', 'fixed')),
  value numeric NOT NULL CHECK (value >= 0),
  kol_name text NOT NULL DEFAULT '',
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  customer_id text NOT NULL,
  customer_name text NOT NULL,
  staff_id text NOT NULL DEFAULT '',
  staff_name text NOT NULL DEFAULT '',
  payment_method text NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  coupon_id text,
  coupon_code text NOT NULL DEFAULT '',
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  gifts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  customer_id text NOT NULL,
  customer_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('充值', '消费', '退款')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions (created_at DESC);

CREATE TABLE IF NOT EXISTS payroll_archives (
  id text PRIMARY KEY,
  week_start bigint NOT NULL,
  week_end bigint NOT NULL,
  label text NOT NULL,
  archived_at bigint NOT NULL,
  total_companion_salary numeric NOT NULL DEFAULT 0,
  total_staff_commission numeric NOT NULL DEFAULT 0,
  companions jsonb NOT NULL DEFAULT '[]'::jsonb,
  staff jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers', 'companions', 'staff', 'services', 'service_tags', 'gift_items',
    'coupons', 'orders', 'transactions', 'payroll_archives', 'app_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO anon, authenticated', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_select_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true)', 'anon_select_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_insert_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', 'anon_insert_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_update_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', 'anon_update_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_delete_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true)', 'anon_delete_' || t, t);
  END LOOP;
END $$;
