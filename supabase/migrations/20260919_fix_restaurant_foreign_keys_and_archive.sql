-- ==============================================================================
-- Migration: Add is_archived and enforce ON DELETE CASCADE on all restaurant child tables
-- Date: 2026-09-19
-- ==============================================================================

-- 1. Add is_archived column to restaurants table
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_restaurants_is_archived ON public.restaurants(is_archived);

-- 2. Enforce ON DELETE CASCADE on restaurant_settings foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'restaurant_settings_restaurant_id_fkey'
  ) THEN
    ALTER TABLE public.restaurant_settings DROP CONSTRAINT restaurant_settings_restaurant_id_fkey;
  END IF;
  
  ALTER TABLE public.restaurant_settings
    ADD CONSTRAINT restaurant_settings_restaurant_id_fkey
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
END $$;

-- 3. Enforce ON DELETE CASCADE on restaurant_theme_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'restaurant_theme_settings'
  ) THEN
    ALTER TABLE public.restaurant_theme_settings DROP CONSTRAINT IF EXISTS restaurant_theme_settings_restaurant_id_fkey;
    ALTER TABLE public.restaurant_theme_settings
      ADD CONSTRAINT restaurant_theme_settings_restaurant_id_fkey
      FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Enforce ON DELETE CASCADE on restaurant_subscriptions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'restaurant_subscriptions_restaurant_id_fkey'
  ) THEN
    ALTER TABLE public.restaurant_subscriptions DROP CONSTRAINT restaurant_subscriptions_restaurant_id_fkey;
    ALTER TABLE public.restaurant_subscriptions
      ADD CONSTRAINT restaurant_subscriptions_restaurant_id_fkey
      FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;
