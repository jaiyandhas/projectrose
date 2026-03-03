-- =============================================================
-- AI Answer Evaluator — Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Profiles (extends auth.users)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------
-- 2. Questions (user-created questions)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own questions"
  ON public.questions FOR ALL
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 3. Evaluations
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text       TEXT        NOT NULL,
  answer_text         TEXT        NOT NULL,
  sample_answer_text  TEXT,
  originality_score   NUMERIC(4,2) CHECK (originality_score >= 0 AND originality_score <= 10),
  ai_usage_score      NUMERIC(4,2) CHECK (ai_usage_score >= 0 AND ai_usage_score <= 10),
  coverage_score      NUMERIC(4,2) CHECK (coverage_score >= 0 AND coverage_score <= 10),
  overall_score       NUMERIC(5,2) CHECK (overall_score >= 0 AND overall_score <= 30),
  feedback_json       JSONB,
  -- feedback_json shape:
  -- {
  --   "strengths": ["..."],
  --   "missing_points": ["..."],
  --   "improvements": ["..."],
  --   "summary": "..."
  -- }
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own evaluations"
  ON public.evaluations FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_evaluations_user_id ON public.evaluations(user_id);
CREATE INDEX idx_evaluations_created_at ON public.evaluations(created_at DESC);

-- ---------------------------------------------------------------
-- 4. Analytics (materialized summary per user)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_score       NUMERIC(5,2) DEFAULT 0,
  attempts_count  INTEGER      DEFAULT 0,
  last_updated    TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON public.analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics"
  ON public.analytics FOR ALL
  USING (auth.uid() = user_id);

-- Auto-upsert analytics row after each evaluation insert
CREATE OR REPLACE FUNCTION public.update_analytics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.analytics (user_id, avg_score, attempts_count, last_updated)
  SELECT
    NEW.user_id,
    ROUND(AVG(overall_score), 2),
    COUNT(*),
    NOW()
  FROM public.evaluations
  WHERE user_id = NEW.user_id
  ON CONFLICT (user_id) DO UPDATE
  SET
    avg_score      = EXCLUDED.avg_score,
    attempts_count = EXCLUDED.attempts_count,
    last_updated   = EXCLUDED.last_updated;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_evaluation_created
  AFTER INSERT ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_analytics();
