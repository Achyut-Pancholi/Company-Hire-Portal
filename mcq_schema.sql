-- =================================================
-- MCQ Objective Assessment Schema Migration
-- Run this in the Supabase SQL Editor
-- =================================================

-- 1. Create MCQ Questions Bank Table
CREATE TABLE IF NOT EXISTS public.mcq_questions_bank (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  department text NOT NULL,
  sub_department text NOT NULL,
  experience_level text NOT NULL, -- 'Fresher', 'Junior', 'Mid level', 'Senior', 'Lead'
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  points_value integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Alter Candidates Table to support MCQ Tracking
ALTER TABLE public.candidates 
  ADD COLUMN IF NOT EXISTS mcq_status text DEFAULT 'Pending' CHECK (mcq_status IN ('Pending', 'Sent', 'Completed')),
  ADD COLUMN IF NOT EXISTS mcq_score integer,
  ADD COLUMN IF NOT EXISTS remark_mcq text;

-- 3. Enable Row Level Security (RLS) & Policies for mcq_questions_bank
ALTER TABLE public.mcq_questions_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on mcq_questions_bank" 
  ON public.mcq_questions_bank FOR SELECT USING (true);

CREATE POLICY "Enable write access for authenticated users on mcq_questions_bank" 
  ON public.mcq_questions_bank FOR ALL TO authenticated USING (true) WITH CHECK (true);
