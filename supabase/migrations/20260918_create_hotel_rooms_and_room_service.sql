-- ==============================================================================
-- Migration: Create Hotel Rooms and Room Service Management
-- Date: 2026-09-18
-- ==============================================================================

-- 1. Create hotel_rooms table
CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  room_name text,
  floor_number integer NOT NULL DEFAULT 1,
  room_type text NOT NULL DEFAULT 'Deluxe',
  bed_type text NOT NULL DEFAULT 'Double Bed',
  capacity integer NOT NULL DEFAULT 2,
  price_per_night numeric(10, 2) NOT NULL DEFAULT 0.00,
  extra_guest_price numeric(10, 2) NOT NULL DEFAULT 0.00,
  description text,
  image_url text,
  status text NOT NULL DEFAULT 'AVAILABLE',
  is_active boolean NOT NULL DEFAULT true,
  amenities jsonb DEFAULT '["High-Speed Wi-Fi", "Air Conditioning", "HD Smart TV", "Hot Water", "Electric Kettle", "Room Service", "Daily Housekeeping"]'::jsonb,
  qr_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_room_per_hotel UNIQUE (restaurant_id, room_number)
);

-- Index for fast lookup by token and restaurant
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_qr_token ON public.hotel_rooms(qr_token);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_restaurant_id ON public.hotel_rooms(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_status ON public.hotel_rooms(status);

-- 2. Create room_service_requests table
CREATE TABLE IF NOT EXISTS public.room_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  request_type text NOT NULL, -- 'HOUSEKEEPING', 'WATER', 'TOWEL', 'PILLOW', 'BLANKET', 'LAUNDRY', 'MAINTENANCE', 'TAXI', 'WAKE_UP_CALL', 'ROOM_SERVICE', 'RECEPTION', 'OTHER'
  description text,
  notes text,
  priority text NOT NULL DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
  status text NOT NULL DEFAULT 'NEW', -- 'NEW', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  guest_name text,
  guest_mobile text,
  assigned_staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_room_requests_room_id ON public.room_service_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_room_requests_restaurant_id ON public.room_service_requests(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_room_requests_status ON public.room_service_requests(status);

-- 3. Extend orders table to support hotel rooms and order types
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.hotel_rooms(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'DINE_IN';

CREATE INDEX IF NOT EXISTS idx_orders_room_id ON public.orders(room_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);

-- 4. Enable Row Level Security
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_requests ENABLE ROW LEVEL SECURITY;

-- 5. Create Permissive Policies for anonymous guests and authenticated staff
DROP POLICY IF EXISTS anon_select_hotel_rooms ON public.hotel_rooms;
DROP POLICY IF EXISTS anon_insert_hotel_rooms ON public.hotel_rooms;
DROP POLICY IF EXISTS anon_update_hotel_rooms ON public.hotel_rooms;
DROP POLICY IF EXISTS anon_delete_hotel_rooms ON public.hotel_rooms;

CREATE POLICY anon_select_hotel_rooms ON public.hotel_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_hotel_rooms ON public.hotel_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_hotel_rooms ON public.hotel_rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_hotel_rooms ON public.hotel_rooms FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS anon_select_room_requests ON public.room_service_requests;
DROP POLICY IF EXISTS anon_insert_room_requests ON public.room_service_requests;
DROP POLICY IF EXISTS anon_update_room_requests ON public.room_service_requests;
DROP POLICY IF EXISTS anon_delete_room_requests ON public.room_service_requests;

CREATE POLICY anon_select_room_requests ON public.room_service_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_room_requests ON public.room_service_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_room_requests ON public.room_service_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_room_requests ON public.room_service_requests FOR DELETE TO anon, authenticated USING (true);

-- 6. Insert initial demo hotel rooms for the primary demo resort
INSERT INTO public.hotel_rooms (
  restaurant_id, room_number, room_name, floor_number, room_type, bed_type, capacity, price_per_night, extra_guest_price, status, qr_token, image_url, description
) VALUES
(
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  '101',
  'Garden View Deluxe',
  1,
  'Deluxe',
  'King Bed',
  2,
  3500.00,
  800.00,
  'AVAILABLE',
  'RM-101-GARDEN',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
  'Spacious luxury room on ground floor overlooking landscaped gardens with private balcony.'
),
(
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  '102',
  'Courtyard Premier',
  1,
  'Super Deluxe',
  'Queen Bed',
  3,
  4200.00,
  900.00,
  'OCCUPIED',
  'RM-102-COURT',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
  'Premium air-conditioned suite with cozy seating area and luxury bathroom amenities.'
),
(
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  '201',
  'Mountain Vista Suite',
  2,
  'Suite',
  'King Bed',
  4,
  6500.00,
  1200.00,
  'AVAILABLE',
  'RM-201-VISTA',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  'Panoramic top-floor suite featuring king-size plush bedding, work desk, and mini-bar.'
),
(
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  '202',
  'Heritage Family Room',
  2,
  'Family Room',
  'Twin Beds',
  4,
  5500.00,
  1000.00,
  'CLEANING',
  'RM-202-FAMILY',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
  'Spacious interconnected family suite suitable for family vacations with 2 queen beds.'
)
ON CONFLICT (restaurant_id, room_number) DO UPDATE SET
  price_per_night = EXCLUDED.price_per_night,
  qr_token = EXCLUDED.qr_token,
  status = EXCLUDED.status;
