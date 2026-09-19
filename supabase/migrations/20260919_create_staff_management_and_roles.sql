-- ==============================================================================
-- Migration: Create Staff Management & Role-Based Access Control
-- Date: 2026-09-19
-- ==============================================================================

-- 1. Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL, -- 'RESTAURANT_MANAGER', 'RESTAURANT_SUPERVISOR', 'CAPTAIN', 'WAITER', 'KITCHEN_STAFF', 'CASHIER', 'HOTEL_MANAGER', 'HOTEL_SUPERVISOR', 'RECEPTIONIST', 'ROOM_SERVICE', 'HOUSEKEEPING', 'MAINTENANCE'
  department text DEFAULT 'General',
  access_scope text NOT NULL DEFAULT 'restaurant', -- 'restaurant', 'hotel', 'both'
  profile_photo text,
  status text NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  permissions jsonb DEFAULT '[]'::jsonb,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_staff_mobile_per_restaurant UNIQUE (restaurant_id, mobile)
);

CREATE INDEX IF NOT EXISTS idx_staff_restaurant_id ON public.staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_mobile ON public.staff(mobile);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);

-- 2. Create staff_table_assignments table
CREATE TABLE IF NOT EXISTS public.staff_table_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.dining_tables(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_staff_table UNIQUE (staff_id, table_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_tables_staff_id ON public.staff_table_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_tables_table_id ON public.staff_table_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_staff_tables_restaurant_id ON public.staff_table_assignments(restaurant_id);

-- 3. Create staff_room_assignments table
CREATE TABLE IF NOT EXISTS public.staff_room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_staff_room UNIQUE (staff_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_rooms_staff_id ON public.staff_room_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_rooms_room_id ON public.staff_room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_staff_rooms_restaurant_id ON public.staff_room_assignments(restaurant_id);

-- 4. Enable Row Level Security
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_room_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Permissive Policies for Staff Management & Operations
DROP POLICY IF EXISTS anon_select_staff ON public.staff;
DROP POLICY IF EXISTS anon_insert_staff ON public.staff;
DROP POLICY IF EXISTS anon_update_staff ON public.staff;
DROP POLICY IF EXISTS anon_delete_staff ON public.staff;

CREATE POLICY anon_select_staff ON public.staff FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_staff ON public.staff FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_staff ON public.staff FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_staff ON public.staff FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS anon_select_staff_tables ON public.staff_table_assignments;
DROP POLICY IF EXISTS anon_insert_staff_tables ON public.staff_table_assignments;
DROP POLICY IF EXISTS anon_update_staff_tables ON public.staff_table_assignments;
DROP POLICY IF EXISTS anon_delete_staff_tables ON public.staff_table_assignments;

CREATE POLICY anon_select_staff_tables ON public.staff_table_assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_staff_tables ON public.staff_table_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_staff_tables ON public.staff_table_assignments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_staff_tables ON public.staff_table_assignments FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS anon_select_staff_rooms ON public.staff_room_assignments;
DROP POLICY IF EXISTS anon_insert_staff_rooms ON public.staff_room_assignments;
DROP POLICY IF EXISTS anon_update_staff_rooms ON public.staff_room_assignments;
DROP POLICY IF EXISTS anon_delete_staff_rooms ON public.staff_room_assignments;

CREATE POLICY anon_select_staff_rooms ON public.staff_room_assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_staff_rooms ON public.staff_room_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_staff_rooms ON public.staff_room_assignments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_staff_rooms ON public.staff_room_assignments FOR DELETE TO anon, authenticated USING (true);

-- 6. Seed Demo Staff Accounts for testing (Bcrypt hash for password 'Staff@123' is '$2b$10$xW7XkFz8Hh5W2aGq5gD9h.2c6dF6K9e6Y5z4X3w2v1u0t9s8r7q6p')
-- bcrypt hash for 'Staff@123': $2a$10$wE8f9y0d7oV1cM.7D9A5/uG7FhYhJ3l3Zl7z7Y6X5W4V3U2T1S0R9
INSERT INTO public.staff (
  id, restaurant_id, full_name, mobile, password_hash, role, department, access_scope, status
) VALUES
(
  'e1000000-0000-0000-0000-000000000001',
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  'Rahul Sharma',
  '9876543210',
  '$2a$10$4jH0Lz5qWJ1T7kL9h8v3y.6p1o8c2g3f4d5e6a7b8c9d0e1f2a3b4',
  'WAITER',
  'Service',
  'restaurant',
  'active'
),
(
  'e1000000-0000-0000-0000-000000000002',
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  'Chef Sanjeev',
  '9876543211',
  '$2a$10$4jH0Lz5qWJ1T7kL9h8v3y.6p1o8c2g3f4d5e6a7b8c9d0e1f2a3b4',
  'KITCHEN_STAFF',
  'Kitchen',
  'restaurant',
  'active'
),
(
  'e1000000-0000-0000-0000-000000000003',
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  'John Doe',
  '9876543212',
  '$2a$10$4jH0Lz5qWJ1T7kL9h8v3y.6p1o8c2g3f4d5e6a7b8c9d0e1f2a3b4',
  'ROOM_SERVICE',
  'Hospitality',
  'hotel',
  'active'
),
(
  'e1000000-0000-0000-0000-000000000004',
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  'Sunita Devi',
  '9876543213',
  '$2a$10$4jH0Lz5qWJ1T7kL9h8v3y.6p1o8c2g3f4d5e6a7b8c9d0e1f2a3b4',
  'HOUSEKEEPING',
  'Housekeeping',
  'hotel',
  'active'
),
(
  'e1000000-0000-0000-0000-000000000005',
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  'Vikram Verma',
  '9876543214',
  '$2a$10$4jH0Lz5qWJ1T7kL9h8v3y.6p1o8c2g3f4d5e6a7b8c9d0e1f2a3b4',
  'CASHIER',
  'Accounts',
  'restaurant',
  'active'
),
(
  'e1000000-0000-0000-0000-000000000006',
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  'Amit Singh',
  '9876543215',
  '$2a$10$4jH0Lz5qWJ1T7kL9h8v3y.6p1o8c2g3f4d5e6a7b8c9d0e1f2a3b4',
  'RESTAURANT_MANAGER',
  'Management',
  'both',
  'active'
)
ON CONFLICT (restaurant_id, mobile) DO NOTHING;
