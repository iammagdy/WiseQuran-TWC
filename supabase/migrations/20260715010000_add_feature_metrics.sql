-- Add feature_metrics column to visitor_analytics
ALTER TABLE public.visitor_analytics ADD COLUMN IF NOT EXISTS feature_metrics jsonb DEFAULT '{"pages":{},"actions":{}}'::jsonb;
