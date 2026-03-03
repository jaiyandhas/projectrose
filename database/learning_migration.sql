-- =============================================================
-- AI Answer Evaluator — Human-in-the-Loop Learning Migration
-- Run this in Supabase SQL Editor AFTER the original schema.sql
-- =============================================================

-- ---------------------------------------------------------------
-- 5. Manual Scores (human-labeled score overrides)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manual_scores (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id     UUID         NOT NULL UNIQUE REFERENCES public.evaluations(id) ON DELETE CASCADE,
  user_id           UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_coverage  NUMERIC(4,2) NOT NULL CHECK (concept_coverage >= 0 AND concept_coverage <= 10),
  technical_depth   NUMERIC(4,2) NOT NULL CHECK (technical_depth >= 0 AND technical_depth <= 10),
  clarity           NUMERIC(4,2) NOT NULL CHECK (clarity >= 0 AND clarity <= 10),
  originality       NUMERIC(4,2) NOT NULL CHECK (originality >= 0 AND originality <= 10),
  notes             TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.manual_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own manual scores"
  ON public.manual_scores FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_manual_scores_evaluation_id ON public.manual_scores(evaluation_id);
CREATE INDEX idx_manual_scores_user_id ON public.manual_scores(user_id);

-- ---------------------------------------------------------------
-- 6. Extracted Features (NLP feature vectors per evaluation)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.extracted_features (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id             UUID         NOT NULL UNIQUE REFERENCES public.evaluations(id) ON DELETE CASCADE,
  word_count                INTEGER,
  sentence_count            INTEGER,
  avg_sentence_length       NUMERIC(6,2),
  tech_keyword_count        INTEGER,
  keyword_density           NUMERIC(8,4),
  has_examples              BOOLEAN,
  has_lists                 BOOLEAN,
  has_headings              BOOLEAN,
  structure_connectors_count INTEGER,
  noun_count                INTEGER,
  verb_count                INTEGER,
  entity_count              INTEGER,
  lexical_diversity         NUMERIC(6,4),
  structure_score           NUMERIC(4,2),
  extracted_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.extracted_features ENABLE ROW LEVEL SECURITY;

-- Features are readable by the evaluation owner
CREATE POLICY "Users can view own extracted features"
  ON public.extracted_features FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM public.evaluations
      WHERE id = evaluation_id
    )
  );

-- Service role can insert/update (backend service role key)
CREATE POLICY "Service can manage extracted features"
  ON public.extracted_features FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_extracted_features_evaluation_id ON public.extracted_features(evaluation_id);

-- ---------------------------------------------------------------
-- 7. Model Versions (track training runs)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.model_versions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_count  INTEGER      NOT NULL,
  avg_r2_score  NUMERIC(6,4),
  scores_json   JSONB,
  -- scores_json shape:
  -- {
  --   "concept_coverage": {"r2": 0.85, "model_path": "..."},
  --   "technical_depth": {...},
  --   ...
  -- }
  model_dir     TEXT,
  trained_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Model versions are publicly readable (for learning dashboard)
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view model versions"
  ON public.model_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service can insert model versions"
  ON public.model_versions FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_model_versions_trained_at ON public.model_versions(trained_at DESC);
