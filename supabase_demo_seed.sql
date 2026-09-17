-- ==============================================================================
-- DISHGAZE / RESTO: DEMO DATABASE SEED & RLS POLICIES
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tsivosarqlonmssuebwl/sql/new
-- ==============================================================================

-- 1. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ensure RLS Policies allow both 'anon' (customer & direct admin) and 'authenticated'
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop old restricted policies
DROP POLICY IF EXISTS "select_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "insert_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "update_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "delete_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS anon_select_restaurants ON public.restaurants;
DROP POLICY IF EXISTS anon_insert_restaurants ON public.restaurants;
DROP POLICY IF EXISTS anon_update_restaurants ON public.restaurants;
DROP POLICY IF EXISTS anon_delete_restaurants ON public.restaurants;

CREATE POLICY anon_select_restaurants ON public.restaurants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_restaurants ON public.restaurants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_restaurants ON public.restaurants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_restaurants ON public.restaurants FOR DELETE TO anon, authenticated USING (true);

-- Categories policies
DROP POLICY IF EXISTS "select_categories" ON public.categories;
DROP POLICY IF EXISTS "insert_categories" ON public.categories;
DROP POLICY IF EXISTS "update_categories" ON public.categories;
DROP POLICY IF EXISTS "delete_categories" ON public.categories;
DROP POLICY IF EXISTS anon_select_categories ON public.categories;
DROP POLICY IF EXISTS anon_insert_categories ON public.categories;
DROP POLICY IF EXISTS anon_update_categories ON public.categories;
DROP POLICY IF EXISTS anon_delete_categories ON public.categories;

CREATE POLICY anon_select_categories ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_categories ON public.categories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_categories ON public.categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_categories ON public.categories FOR DELETE TO anon, authenticated USING (true);

-- Menu items policies
DROP POLICY IF EXISTS "select_menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "insert_menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "update_menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "delete_menu_items" ON public.menu_items;
DROP POLICY IF EXISTS anon_select_menu_items ON public.menu_items;
DROP POLICY IF EXISTS anon_insert_menu_items ON public.menu_items;
DROP POLICY IF EXISTS anon_update_menu_items ON public.menu_items;
DROP POLICY IF EXISTS anon_delete_menu_items ON public.menu_items;

CREATE POLICY anon_select_menu_items ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_menu_items ON public.menu_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_menu_items ON public.menu_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_menu_items ON public.menu_items FOR DELETE TO anon, authenticated USING (true);

-- Item variants policies
DROP POLICY IF EXISTS "select_item_variants" ON public.item_variants;
DROP POLICY IF EXISTS "insert_item_variants" ON public.item_variants;
DROP POLICY IF EXISTS "update_item_variants" ON public.item_variants;
DROP POLICY IF EXISTS "delete_item_variants" ON public.item_variants;
DROP POLICY IF EXISTS anon_select_item_variants ON public.item_variants;
DROP POLICY IF EXISTS anon_insert_item_variants ON public.item_variants;
DROP POLICY IF EXISTS anon_update_item_variants ON public.item_variants;
DROP POLICY IF EXISTS anon_delete_item_variants ON public.item_variants;

CREATE POLICY anon_select_item_variants ON public.item_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_item_variants ON public.item_variants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_item_variants ON public.item_variants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_item_variants ON public.item_variants FOR DELETE TO anon, authenticated USING (true);

-- Dining tables policies
DROP POLICY IF EXISTS "select_dining_tables" ON public.dining_tables;
DROP POLICY IF EXISTS "insert_dining_tables" ON public.dining_tables;
DROP POLICY IF EXISTS "update_dining_tables" ON public.dining_tables;
DROP POLICY IF EXISTS "delete_dining_tables" ON public.dining_tables;
DROP POLICY IF EXISTS anon_select_dining_tables ON public.dining_tables;
DROP POLICY IF EXISTS anon_insert_dining_tables ON public.dining_tables;
DROP POLICY IF EXISTS anon_update_dining_tables ON public.dining_tables;
DROP POLICY IF EXISTS anon_delete_dining_tables ON public.dining_tables;

CREATE POLICY anon_select_dining_tables ON public.dining_tables FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_dining_tables ON public.dining_tables FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_dining_tables ON public.dining_tables FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_dining_tables ON public.dining_tables FOR DELETE TO anon, authenticated USING (true);

-- Orders policies
DROP POLICY IF EXISTS "select_orders" ON public.orders;
DROP POLICY IF EXISTS "insert_orders" ON public.orders;
DROP POLICY IF EXISTS "update_orders" ON public.orders;
DROP POLICY IF EXISTS "delete_orders" ON public.orders;
DROP POLICY IF EXISTS anon_select_orders ON public.orders;
DROP POLICY IF EXISTS anon_insert_orders ON public.orders;
DROP POLICY IF EXISTS anon_update_orders ON public.orders;
DROP POLICY IF EXISTS anon_delete_orders ON public.orders;

CREATE POLICY anon_select_orders ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_orders ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_orders ON public.orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_orders ON public.orders FOR DELETE TO anon, authenticated USING (true);

-- Order items policies
DROP POLICY IF EXISTS "select_order_items" ON public.order_items;
DROP POLICY IF EXISTS "insert_order_items" ON public.order_items;
DROP POLICY IF EXISTS "update_order_items" ON public.order_items;
DROP POLICY IF EXISTS "delete_order_items" ON public.order_items;
DROP POLICY IF EXISTS anon_select_order_items ON public.order_items;
DROP POLICY IF EXISTS anon_insert_order_items ON public.order_items;
DROP POLICY IF EXISTS anon_update_order_items ON public.order_items;
DROP POLICY IF EXISTS anon_delete_order_items ON public.order_items;

CREATE POLICY anon_select_order_items ON public.order_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_order_items ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_order_items ON public.order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_order_items ON public.order_items FOR DELETE TO anon, authenticated USING (true);

-- Restaurant settings policies
DROP POLICY IF EXISTS "select_restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "insert_restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "update_restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "delete_restaurant_settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS anon_select_restaurant_settings ON public.restaurant_settings;
DROP POLICY IF EXISTS anon_insert_restaurant_settings ON public.restaurant_settings;
DROP POLICY IF EXISTS anon_update_restaurant_settings ON public.restaurant_settings;
DROP POLICY IF EXISTS anon_delete_restaurant_settings ON public.restaurant_settings;

CREATE POLICY anon_select_restaurant_settings ON public.restaurant_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY anon_insert_restaurant_settings ON public.restaurant_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY anon_update_restaurant_settings ON public.restaurant_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_delete_restaurant_settings ON public.restaurant_settings FOR DELETE TO anon, authenticated USING (true);

-- 3. INSERT DEMO RESTAURANT
-- Login: admin@resto.com / Admin@123
INSERT INTO public.restaurants (
  id,
  name,
  slug,
  owner_name,
  mobile,
  email,
  password_hash,
  address,
  city,
  country,
  currency,
  currency_symbol,
  primary_color,
  is_active,
  is_verified
) VALUES (
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  'Spice Garden',
  'spice-garden',
  'Admin User',
  '9876543210',
  'admin@resto.com',
  '$2b$10$gJyUbAAu7LEVYSwNC0mwzeIYMmNtd1xVVD/..R94fUgrJJCUUzWBW',
  '42 Gourmet Avenue, MG Road',
  'Mumbai',
  'India',
  'INR',
  '₹',
  '#0F766E',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  password_hash = '$2b$10$gJyUbAAu7LEVYSwNC0mwzeIYMmNtd1xVVD/..R94fUgrJJCUUzWBW',
  is_active = true,
  email = 'admin@resto.com';

-- 4. INSERT SETTINGS
INSERT INTO public.restaurant_settings (
  restaurant_id,
  theme_color,
  gst_percent,
  service_charge,
  accept_orders,
  restaurant_open,
  whatsapp_number
) VALUES (
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  '#0F766E',
  5.0,
  0.0,
  true,
  true,
  '+919876543210'
)
ON CONFLICT DO NOTHING;

-- 5. INSERT DINING TABLES WITH ACTIVE QR TOKENS
INSERT INTO public.dining_tables (id, restaurant_id, table_number, table_name, capacity, qr_token, is_active, status) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'T1', 'Window Seat T1', 4, 'TBL-M12WSF9O', true, 'available'),
  ('a2222222-2222-2222-2222-222222222222', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'T2', 'Garden Terrace T2', 2, 'TBL-M12WSF9P', true, 'available'),
  ('a3333333-3333-3333-3333-333333333333', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'T3', 'Center Booth T3', 6, 'TBL-M12WSF9Q', true, 'available'),
  ('a4444444-4444-4444-4444-444444444444', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'T4', 'Family Hall T4', 8, 'TBL-M12WSF9R', true, 'available'),
  ('a5555555-5555-5555-5555-555555555555', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'T5', 'Patio Corner T5', 4, 'TBL-M12WSF9S', true, 'available')
ON CONFLICT (id) DO NOTHING;

-- 6. INSERT MENU CATEGORIES
INSERT INTO public.categories (id, restaurant_id, name, icon, display_order, is_active) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'Starters & Appetizers', '🥘', 1, true),
  ('c2222222-2222-2222-2222-222222222222', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'Main Course Curry', '🍛', 2, true),
  ('c3333333-3333-3333-3333-333333333333', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'Biryani & Rice', '🍚', 3, true),
  ('c4444444-4444-4444-4444-444444444444', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'Tandoori Breads', '🫓', 4, true),
  ('c5555555-5555-5555-5555-555555555555', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'Beverages & Mocktails', '🍹', 5, true),
  ('c6666666-6666-6666-6666-666666666666', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'Desserts', '🍨', 6, true)
ON CONFLICT (id) DO NOTHING;

-- 7. INSERT DELICIOUS MENU ITEMS
INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, food_type, preparation_time, is_available, is_featured, is_recommended, image_url) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'c1111111-1111-1111-1111-111111111111', 'Paneer Tikka Angara', 'Smoked cottage cheese cubes marinated in Kashmiri red chili, hung curd, and stone-ground spices.', 280.00, 'veg', 15, true, true, true, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&q=80'),
  ('b2222222-2222-2222-2222-222222222222', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'c1111111-1111-1111-1111-111111111111', 'Crispy Corn & Water Chestnut', 'Golden tossed crispy sweet corn kernels seasoned with scallions and crushed black pepper.', 220.00, 'veg', 12, true, false, false, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80'),
  ('b3333333-3333-3333-3333-333333333333', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'c2222222-2222-2222-2222-222222222222', 'Butter Paneer Masala', 'Velvety slow-simmered tomato gravy infused with aromatic fenugreek and organic artisanal butter.', 320.00, 'veg', 18, true, true, true, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80'),
  ('b4444444-4444-4444-4444-444444444444', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'c2222222-2222-2222-2222-222222222222', 'Dal Makhani Royal', 'Black lentils slow-cooked overnight over charcoal, finished with churned white butter.', 260.00, 'veg', 20, true, true, false, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80'),
  ('b5555555-5555-5555-5555-555555555555', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'c3333333-3333-3333-3333-333333333333', 'Hyderabadi Dum Biryani', 'Long-grain royal Basmati layered with seasonal vegetables, caramelized onions, saffron & mint.', 310.00, 'veg', 25, true, true, true, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'),
  ('b6666666-6666-6666-6666-666666666666', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'c4444444-4444-4444-4444-444444444444', 'Garlic Butter Naan', 'Fluffy clay-oven flatbread topped with toasted garlic flakes and brushed with golden butter.', 65.00, 'veg', 8, true, false, false, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80'),
  ('b7777777-7777-7777-7777-777777777777', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'c5555555-5555-5555-5555-555555555555', 'Fresh Mint Mojito', 'Crushed fresh garden mint, zesty Key lime, sparkling mineral water, and raw cane sugar.', 140.00, 'veg', 5, true, true, false, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80'),
  ('b8888888-8888-8888-8888-888888888888', 'd3b07384-d113-4678-bb56-9a2c270c5387', 'c6666666-6666-6666-6666-666666666666', 'Gulab Jamun with Rabdi', 'Warm saffron-scented milk dough dumplings dipped in cardamom syrup, topped with rich rabdi.', 150.00, 'veg', 5, true, true, true, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80')
ON CONFLICT (id) DO NOTHING;

-- 8. SAMPLE LIVE ORDERS (FOR KITCHEN DASHBOARD)
INSERT INTO public.orders (
  id,
  restaurant_id,
  table_id,
  order_number,
  customer_name,
  customer_mobile,
  order_type,
  order_status,
  payment_status,
  payment_method,
  subtotal,
  tax_amount,
  total_amount,
  created_at
) VALUES (
  'e1111111-1111-1111-1111-111111111111',
  'd3b07384-d113-4678-bb56-9a2c270c5387',
  'a1111111-1111-1111-1111-111111111111',
  'ORD-101',
  'Rahul Sharma',
  '9876500001',
  'dine_in',
  'confirmed',
  'paid',
  'upi',
  665.00,
  33.25,
  698.25,
  now() - interval '12 minutes'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (order_id, menu_item_id, item_name, quantity, unit_price, total_price) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Paneer Tikka Angara', 1, 280.00, 280.00),
  ('e1111111-1111-1111-1111-111111111111', 'b3333333-3333-3333-3333-333333333333', 'Butter Paneer Masala', 1, 320.00, 320.00),
  ('e1111111-1111-1111-1111-111111111111', 'b6666666-6666-6666-6666-666666666666', 'Garlic Butter Naan', 1, 65.00, 65.00)
ON CONFLICT DO NOTHING;
