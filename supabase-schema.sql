-- ============================================================
-- USI FeedForward - Supabase Database Schema v2
-- Universidad de Sta. Isabel De Naga, Inc.
-- ============================================================
-- CHANGES FROM v1:
--   • student_roster table (pre-loaded masterlist, no auth accounts)
--   • feedback table gains: giver_type, student_id_hash, school_year
--   • giver_id is now nullable (NULL for student submissions)
--   • Materialized view employee_ratings_cache for fast dashboards
--   • verify_student() RPC — only door into the roster (anon cannot query it directly)
--   • check_student_duplicate() RPC — 24-hour cooldown for student path
--   • import_student_roster() RPC — admin CSV batch upsert
--   • Suspicious patterns view extended to cover student hash repeats
--   • All critical indexes added for query performance
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES TABLE (employees & admins only — students excluded)
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  employee_id     VARCHAR(50)  UNIQUE NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  role            VARCHAR(50)  NOT NULL CHECK (role IN ('teaching', 'non_teaching', 'admin')),
  department      VARCHAR(255),
  position        VARCHAR(255),
  avatar_url      TEXT,
  qr_token        UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENT ROSTER TABLE
-- Imported each semester from Registrar CSV export.
-- No passwords. No auth. Read-only reference — all queries
-- must go through verify_student() RPC, never direct SELECT.
-- Raw student IDs are NEVER stored — only SHA-256 hashes.
-- Storage: ~90 bytes/row x 10,000 students = ~900 KB total.
-- ============================================================
CREATE TABLE public.student_roster (
  -- SHA-256(UPPER(TRIM(student_id))) hashed on the client before upload
  id_hash         TEXT PRIMARY KEY,

  -- SHA-256(UPPER(TRIM(full_name))) hashed on the client before upload
  -- Stored separately so frontend can verify name without storing plaintext in transit
  name_hash       TEXT NOT NULL,

  -- Plaintext kept only for admin display in the suspicious activity panel
  full_name       VARCHAR(255) NOT NULL,
  course_code     VARCHAR(30),
  year_level      SMALLINT CHECK (year_level BETWEEN 1 AND 6),

  -- Set from the upload batch (e.g. '2024-2025')
  school_year     VARCHAR(9) NOT NULL,
  is_enrolled     BOOLEAN DEFAULT true,
  last_synced_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roster_enrolled ON public.student_roster(is_enrolled)
  WHERE is_enrolled = true;

-- ============================================================
-- FEEDBACK TABLE
-- Two submission paths:
--   'employee' → giver_id is set, student_id_hash is NULL
--   'student'  → giver_id is NULL, student_id_hash is set
-- ============================================================
CREATE TABLE public.feedback (
  id                UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id      UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  giver_id          UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_id_hash   TEXT    REFERENCES public.student_roster(id_hash) ON DELETE SET NULL,

  giver_type        VARCHAR(10) NOT NULL CHECK (giver_type IN ('employee', 'student')),

  -- Ratings (SMALLINT saves 2 bytes vs INTEGER per column — matters at scale)
  q1_greet          SMALLINT NOT NULL CHECK (q1_greet          BETWEEN 1 AND 4),
  q2_listen         SMALLINT NOT NULL CHECK (q2_listen         BETWEEN 1 AND 4),
  q3_communicate    SMALLINT NOT NULL CHECK (q3_communicate    BETWEEN 1 AND 4),
  q4_follow_through SMALLINT NOT NULL CHECK (q4_follow_through BETWEEN 1 AND 4),
  q5_dignity        SMALLINT NOT NULL CHECK (q5_dignity        BETWEEN 1 AND 4),
  q6_accuracy       SMALLINT NOT NULL CHECK (q6_accuracy       BETWEEN 1 AND 4),
  q7_overall        SMALLINT NOT NULL CHECK (q7_overall        BETWEEN 1 AND 4),

  comments          TEXT,

  average_rating    DECIMAL(4,2) GENERATED ALWAYS AS (
    (q1_greet + q2_listen + q3_communicate + q4_follow_through
     + q5_dignity + q6_accuracy + q7_overall)::DECIMAL / 7
  ) STORED,

  school_year       VARCHAR(9) NOT NULL DEFAULT (
    CASE WHEN EXTRACT(MONTH FROM NOW()) >= 6
      THEN EXTRACT(YEAR FROM NOW())::TEXT || '-' || (EXTRACT(YEAR FROM NOW())+1)::TEXT
      ELSE (EXTRACT(YEAR FROM NOW())-1)::TEXT || '-' || EXTRACT(YEAR FROM NOW())::TEXT
    END
  ),

  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  is_flagged        BOOLEAN DEFAULT false,
  flag_reason       TEXT,
  reviewed_by       UUID REFERENCES public.profiles(id),
  reviewed_at       TIMESTAMPTZ,

  -- Integrity: exactly one giver column must be set, matching giver_type
  CONSTRAINT chk_giver_consistency CHECK (
    (giver_type = 'employee' AND giver_id IS NOT NULL AND student_id_hash IS NULL)
    OR
    (giver_type = 'student'  AND giver_id IS NULL     AND student_id_hash IS NOT NULL)
  )
);

-- Performance indexes
CREATE INDEX idx_feedback_recipient_date
  ON public.feedback(recipient_id, submitted_at DESC);

CREATE INDEX idx_feedback_employee_dedup
  ON public.feedback(giver_id, recipient_id, submitted_at DESC)
  WHERE giver_type = 'employee';

CREATE INDEX idx_feedback_student_dedup
  ON public.feedback(student_id_hash, recipient_id, submitted_at DESC)
  WHERE giver_type = 'student';

CREATE INDEX idx_feedback_suspicious_emp
  ON public.feedback(giver_id, recipient_id)
  WHERE giver_type = 'employee' AND is_flagged = false;

CREATE INDEX idx_feedback_suspicious_stu
  ON public.feedback(student_id_hash, recipient_id)
  WHERE giver_type = 'student' AND is_flagged = false;

CREATE INDEX idx_feedback_flagged
  ON public.feedback(is_flagged, submitted_at DESC)
  WHERE is_flagged = true;

CREATE INDEX idx_feedback_school_year
  ON public.feedback(school_year, recipient_id);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE public.notifications (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) DEFAULT 'feedback' CHECK (type IN ('feedback', 'flag', 'system')),
  is_read     BOOLEAN DEFAULT false,
  feedback_id UUID REFERENCES public.feedback(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- MATERIALIZED VIEW: employee_ratings_cache
-- Replaces the old plain view. Pre-aggregates per-employee
-- stats for fast dashboard loads. Refreshed automatically
-- after every INSERT on feedback via trigger.
-- REFRESH CONCURRENTLY = zero downtime during refresh.
-- ============================================================
CREATE MATERIALIZED VIEW public.employee_ratings_cache AS
SELECT
  p.id,
  p.full_name,
  p.employee_id,
  p.department,
  p.role,
  p.position,
  COUNT(f.id)                                               AS total_feedback_count,
  COUNT(f.id) FILTER (WHERE f.giver_type = 'employee')     AS employee_feedback_count,
  COUNT(f.id) FILTER (WHERE f.giver_type = 'student')      AS student_feedback_count,
  ROUND(AVG(f.average_rating), 2)                          AS overall_avg_rating,
  ROUND(AVG(f.q1_greet), 2)                                AS avg_q1,
  ROUND(AVG(f.q2_listen), 2)                               AS avg_q2,
  ROUND(AVG(f.q3_communicate), 2)                          AS avg_q3,
  ROUND(AVG(f.q4_follow_through), 2)                       AS avg_q4,
  ROUND(AVG(f.q5_dignity), 2)                              AS avg_q5,
  ROUND(AVG(f.q6_accuracy), 2)                             AS avg_q6,
  ROUND(AVG(f.q7_overall), 2)                              AS avg_q7,
  COUNT(f.id) FILTER (WHERE f.is_flagged)                  AS flagged_count,
  MAX(f.submitted_at)                                      AS last_feedback_date
FROM public.profiles p
LEFT JOIN public.feedback f ON f.recipient_id = p.id
WHERE p.role != 'admin'
GROUP BY p.id, p.full_name, p.employee_id, p.department, p.role, p.position
WITH DATA;

CREATE UNIQUE INDEX idx_ratings_cache_id  ON public.employee_ratings_cache(id);
CREATE INDEX        idx_ratings_cache_avg ON public.employee_ratings_cache(overall_avg_rating DESC NULLS LAST);

-- ============================================================
-- SUSPICIOUS PATTERNS VIEW (employee + student paths combined)
-- ============================================================
CREATE VIEW public.suspicious_patterns AS

SELECT
  'employee'                       AS giver_type,
  giver.full_name                  AS giver_display,
  giver.employee_id                AS giver_identifier,
  recipient.full_name              AS recipient_name,
  recipient.employee_id            AS recipient_employee_id,
  COUNT(f.id)                      AS feedback_count,
  MIN(f.submitted_at)              AS first_feedback,
  MAX(f.submitted_at)              AS last_feedback,
  ROUND(AVG(f.average_rating), 2)  AS avg_given_rating
FROM public.feedback f
JOIN public.profiles giver     ON giver.id     = f.giver_id
JOIN public.profiles recipient ON recipient.id = f.recipient_id
WHERE f.giver_type = 'employee'
GROUP BY giver.id, giver.full_name, giver.employee_id,
         recipient.id, recipient.full_name, recipient.employee_id
HAVING COUNT(f.id) >= 3

UNION ALL

SELECT
  'student'                        AS giver_type,
  COALESCE(sr.full_name, '[Unknown Student]') AS giver_display,
  f.student_id_hash                AS giver_identifier,
  recipient.full_name              AS recipient_name,
  recipient.employee_id            AS recipient_employee_id,
  COUNT(f.id)                      AS feedback_count,
  MIN(f.submitted_at)              AS first_feedback,
  MAX(f.submitted_at)              AS last_feedback,
  ROUND(AVG(f.average_rating), 2)  AS avg_given_rating
FROM public.feedback f
LEFT JOIN public.student_roster sr ON sr.id_hash   = f.student_id_hash
JOIN  public.profiles recipient    ON recipient.id = f.recipient_id
WHERE f.giver_type = 'student'
GROUP BY f.student_id_hash, sr.full_name,
         recipient.id, recipient.full_name, recipient.employee_id
HAVING COUNT(f.id) >= 3

ORDER BY feedback_count DESC;

-- ============================================================
-- RPC: verify_student
-- Frontend calls this with two pre-hashed values.
-- The roster table itself is never accessible via direct API.
-- Returns JSON: { verified, id_hash, full_name, course_code, year_level }
--            or { verified: false, reason: "..." }
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_student(
  p_id_hash   TEXT,
  p_name_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.student_roster%ROWTYPE;
BEGIN
  SELECT * INTO v_student
  FROM public.student_roster
  WHERE id_hash    = p_id_hash
    AND name_hash  = p_name_hash
    AND is_enrolled = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'verified', false,
      'reason', 'Student ID and full name do not match our enrollment records. Please check your details.'
    );
  END IF;

  RETURN json_build_object(
    'verified',    true,
    'id_hash',     v_student.id_hash,
    'full_name',   v_student.full_name,
    'course_code', v_student.course_code,
    'year_level',  v_student.year_level
  );
END;
$$;

-- ============================================================
-- RPC: check_student_duplicate
-- Returns true if this student hash already rated this recipient
-- within the last 24 hours.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_student_duplicate(
  p_student_id_hash TEXT,
  p_recipient_id    UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.feedback
    WHERE student_id_hash = p_student_id_hash
      AND recipient_id    = p_recipient_id
      AND submitted_at   >= NOW() - INTERVAL '24 hours'
  );
$$;

-- ============================================================
-- RPC: import_student_roster
-- Admin only. Receives pre-processed JSON array, upserts rows,
-- marks absent students as is_enrolled = false.
-- ============================================================
CREATE OR REPLACE FUNCTION public.import_student_roster(
  p_school_year TEXT,
  p_students    JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upserted    INT := 0;
  v_deactivated INT := 0;
  v_student     JSONB;
  new_hashes    TEXT[];
BEGIN
  -- Must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT ARRAY(SELECT jsonb_array_elements_text(p_students->'id_hashes')) INTO new_hashes;

  FOR v_student IN SELECT jsonb_array_elements(p_students->'rows') LOOP
    INSERT INTO public.student_roster
      (id_hash, name_hash, full_name, course_code, year_level, school_year, is_enrolled, last_synced_at)
    VALUES (
      v_student->>'id_hash',
      v_student->>'name_hash',
      v_student->>'full_name',
      v_student->>'course_code',
      (v_student->>'year_level')::SMALLINT,
      p_school_year,
      true,
      NOW()
    )
    ON CONFLICT (id_hash) DO UPDATE SET
      name_hash      = EXCLUDED.name_hash,
      full_name      = EXCLUDED.full_name,
      course_code    = EXCLUDED.course_code,
      year_level     = EXCLUDED.year_level,
      school_year    = EXCLUDED.school_year,
      is_enrolled    = true,
      last_synced_at = NOW();

    v_upserted := v_upserted + 1;
  END LOOP;

  UPDATE public.student_roster
  SET is_enrolled = false
  WHERE school_year = p_school_year
    AND id_hash != ALL(new_hashes)
    AND is_enrolled = true;
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  RETURN json_build_object(
    'upserted',    v_upserted,
    'deactivated', v_deactivated,
    'school_year', p_school_year
  );
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');
-- Onboarding: authenticated user may insert their own profile row exactly once
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- student_roster: zero direct access from API — only via SECURITY DEFINER RPCs
CREATE POLICY "roster_deny_all" ON public.student_roster
  FOR ALL USING (false);

-- feedback: employee insert
CREATE POLICY "feedback_employee_insert" ON public.feedback
  FOR INSERT WITH CHECK (
    giver_type = 'employee' AND auth.uid() = giver_id
  );

-- feedback: student insert (anon key, no auth.uid())
CREATE POLICY "feedback_student_insert" ON public.feedback
  FOR INSERT WITH CHECK (
    giver_type = 'student' AND giver_id IS NULL
  );

-- feedback: select
CREATE POLICY "feedback_select" ON public.feedback
  FOR SELECT USING (
    auth.uid() = recipient_id
    OR auth.uid() = giver_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- feedback: admin flag/unflag
CREATE POLICY "feedback_admin_update" ON public.feedback
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- notifications
CREATE POLICY "notif_select_own"  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert_any"  ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update_own"  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- NOTE: With Google OAuth, profile rows are created by the frontend
-- Onboarding page (INSERT into profiles after the user fills in their
-- employee ID, role, and department). There is intentionally NO
-- auto-trigger here — an incomplete auto-created row would break
-- the needsOnboarding check in AuthContext.
--
-- The profiles table allows INSERT from authenticated users for their
-- own row (see RLS policy below).

-- Auto-notify recipient
CREATE OR REPLACE FUNCTION public.handle_new_feedback()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, feedback_id)
  VALUES (
    NEW.recipient_id,
    'New Feedback Received',
    'Someone has submitted a new service evaluation for you.',
    'feedback',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_feedback_submitted
  AFTER INSERT ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_feedback();

-- Refresh materialized view after each feedback batch
CREATE OR REPLACE FUNCTION public.refresh_ratings_cache()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.employee_ratings_cache;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_feedback_cache_refresh
  AFTER INSERT ON public.feedback
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_ratings_cache();

-- Updated_at for profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- GRANT RPC access to anon (student path) and authenticated
-- ============================================================
GRANT EXECUTE ON FUNCTION public.verify_student           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_student_duplicate  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_student_roster    TO authenticated;

-- ============================================================
-- SETUP CHECKLIST
-- 1. Run this entire file in Supabase SQL Editor
-- 2. Register your admin account via the app
-- 3. In Table Editor → profiles, set role = 'admin'
-- 4. Log in → Admin → Student Roster → upload semester CSV
-- ============================================================
