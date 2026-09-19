-- ==============================================================================
-- Migration: Create Restaurant Theme Settings Table
-- Date: 2026-09-18
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.restaurant_theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  primary_color text NOT NULL DEFAULT '#16A34A',
  secondary_color text NOT NULL DEFAULT '#0F172A',
  accent_color text NOT NULL DEFAULT '#22C55E',
  background_color text NOT NULL DEFAULT '#FFFFFF',
  surface_color text NOT NULL DEFAULT '#FFFFFF',
  sidebar_color text NOT NULL DEFAULT '#FFFFFF',
  navbar_color text NOT NULL DEFAULT '#FFFFFF',
  text_color text NOT NULL DEFAULT '#111827',
  muted_text_color text NOT NULL DEFAULT '#6B7280',
  border_color text NOT NULL DEFAULT '#E5E7EB',
  button_color text NOT NULL DEFAULT '#16A34A',
  button_hover_color text NOT NULL DEFAULT '#15803D',
  success_color text NOT NULL DEFAULT '#22C55E',
  warning_color text NOT NULL DEFAULT '#F59E0B',
  danger_color text NOT NULL DEFAULT '#EF4444',
  info_color text NOT NULL DEFAULT '#3B82F6',
  link_color text NOT NULL DEFAULT '#2563EB',
  badge_color text NOT NULL DEFAULT '#16A34A',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_restaurant_theme UNIQUE (restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_theme_settings_restaurant_id ON public.restaurant_theme_settings(restaurant_id);

-- Enable RLS and add public/authenticated policies
ALTER TABLE public.restaurant_theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to restaurant_theme_settings"
  ON public.restaurant_theme_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
