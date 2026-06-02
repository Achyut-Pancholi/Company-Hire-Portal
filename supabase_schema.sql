-- Supabase Schema for KL_HIRE_Unified
-- Copy and paste this into the Supabase SQL Editor to create all required tables.

-- 1. JOBS Table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  department text NOT NULL,
  status text DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT now()
);

-- 2. CANDIDATES Table
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
  created_at timestamp with time zone DEFAULT now()
);

-- 3. QUESTIONS_BANK Table
CREATE TABLE IF NOT EXISTS public.questions_bank (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_role text NOT NULL,
  question_text text NOT NULL,
  is_mandatory boolean DEFAULT false,
  department text,
  sub_department text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. INTERVIEWS Table
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name text NOT NULL,
  candidate_email text NOT NULL,
  job_role text NOT NULL,
  questions jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending',
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  video_url text,
  transcript jsonb,
  summary text,
  scores jsonb,
  sender_email text,
  share_token uuid default gen_random_uuid() not null unique
);

-- Add simple Row Level Security (RLS) policies if needed
-- To allow the service_role key to bypass RLS, you can enable it and do nothing:
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (or configure as per your auth setup)
CREATE POLICY "Allow all operations for authenticated users" ON public.jobs FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.candidates FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.questions_bank FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.interviews FOR ALL USING (true);

-- 5. EMAIL_SETTINGS Table
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  encrypted_password text NOT NULL,
  provider text DEFAULT 'gmail',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON public.email_settings FOR ALL USING (true);
