-- =================================================
-- KL_HIRE_Unified - Master Supabase Database Schema
-- Run this entire script in the Supabase SQL Editor
-- =================================================

-- -------------------------------------------------
-- 1. JOBS Table
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  department text NOT NULL,
  sub_department text NOT NULL,
  description text,
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------
-- 2. CANDIDATES Table
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  skills jsonb DEFAULT '[]'::jsonb,
  job_applied text,
  resume_status text DEFAULT 'Pending',
  form_status text DEFAULT 'Pending',
  video_status text DEFAULT 'Pending',
  tech_status text DEFAULT 'Pending',
  report_status text DEFAULT 'Not Shared',
  stage text DEFAULT 'Resume Upload',
  resume_score integer,
  video_score integer,
  tech_score integer,
  final_recommendation text DEFAULT 'Under Review',
  extracted_data jsonb,
  video_url text,
  report_share_token text UNIQUE,
  report_share_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidates_report_share_token 
  ON public.candidates(report_share_token) 
  WHERE report_share_token IS NOT NULL;

-- -------------------------------------------------
-- 3. QUESTIONS_BANK Table
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions_bank (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  department text DEFAULT 'General',
  sub_department text NOT NULL DEFAULT 'General',
  question_text text NOT NULL,
  is_mandatory boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------
-- 4. INTERVIEWS Table
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name text NOT NULL,
  candidate_email text NOT NULL,
  department text NOT NULL DEFAULT 'General',
  sub_department text NOT NULL DEFAULT 'General',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone,
  video_url text,
  transcript jsonb,
  summary text,
  scores jsonb,
  sender_email text,
  share_token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE
);

-- -------------------------------------------------
-- 5. EMAIL_SETTINGS Table
-- -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  encrypted_password text NOT NULL,
  provider text DEFAULT 'gmail',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- =================================================
-- Row Level Security (RLS) & Policies
-- =================================================

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- JOBS POLICIES
CREATE POLICY "Allow all operations for jobs" ON public.jobs FOR ALL USING (true) WITH CHECK (true);

-- CANDIDATES POLICIES
CREATE POLICY "Allow all operations for candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);

-- QUESTIONS_BANK POLICIES
CREATE POLICY "Enable read access for all users on questions_bank" ON public.questions_bank FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.questions_bank FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.questions_bank FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.questions_bank FOR DELETE USING (true);

-- INTERVIEWS POLICIES
CREATE POLICY "Admins have full access to interviews" ON public.interviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Candidates can read their pending interview" ON public.interviews FOR SELECT TO anon USING (status = 'pending' AND expires_at > now());
CREATE POLICY "Candidates can update interview to completed" ON public.interviews FOR UPDATE TO anon USING (status = 'pending' AND expires_at > now()) WITH CHECK (true);
CREATE POLICY "Completed interviews are publicly readable" ON public.interviews FOR SELECT TO anon USING (status = 'completed');

-- EMAIL_SETTINGS POLICIES
CREATE POLICY "Allow all operations for email_settings" ON public.email_settings FOR ALL USING (true) WITH CHECK (true);


-- =================================================
-- Storage Bucket for Interview Recordings
-- =================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('interview-recordings', 'interview-recordings', true, 524288000) -- 500MB limit
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public can read interview recordings" ON storage.objects FOR SELECT TO public USING (bucket_id = 'interview-recordings');
CREATE POLICY "Candidates can upload interview recordings" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'interview-recordings');
CREATE POLICY "Admins can delete recordings" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'interview-recordings');
