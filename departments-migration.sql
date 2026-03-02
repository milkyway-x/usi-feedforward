-- ============================================================
-- USI FeedForward — Departments Migration
-- Run this in Supabase SQL Editor AFTER the main supabase-schema.sql
-- ============================================================

CREATE TABLE public.departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) UNIQUE NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Any authenticated user can view departments (needed for onboarding & profile editing)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_select" ON public.departments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can add / edit / delete departments
CREATE POLICY "departments_admin_write" ON public.departments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO public.departments (name, sort_order) VALUES
  ('MIS', 1),
  ('Accounting', 2),
  ('BED', 3),
  ('CHS', 4),
  ('GCTC', 5),
  ('ICESA and NSTP', 6),
  ('GSS', 7),
  ('Library', 8),
  ('OIC Director', 9),
  ('External Affairs and Internal Communications', 10),
  ('CVIM', 11),
  ('ICESA', 12),
  ('HED', 13),
  ('HRMDO', 14),
  ('ACAT CENTER', 15),
  ('SDSLS', 16),
  ('SDSLS/GS/CBE', 17),
  ('Graduate Scgool', 18),
  ('President''s Office', 19),
  ('Registrar''s Office', 20),
  ('BSN', 21),
  ('MedTech', 22),
  ('Radtech', 23),
  ('Physical Therapy', 24),
  ('Quality Assurance and Planning', 25),
  ('Admission', 26),
  ('Learning Resource Center', 27),
  ('CBE', 28),
  ('CASTED', 29),
  ('Promotion', 30),
  ('ATLS', 31),
  ('TSL', 32),
  ('Others', 99);
