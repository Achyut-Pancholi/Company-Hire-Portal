-- =================================================
-- Happy Platform - Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- =================================================

-- Create the interviews table
create table public.interviews (
  id uuid default gen_random_uuid() primary key,
  candidate_name text not null,
  candidate_email text not null,
  job_role text not null,
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  video_url text,
  transcript jsonb,
  summary text,
  sender_email text,
  share_token uuid default gen_random_uuid() not null unique
);

-- Enable Row Level Security
alter table public.interviews enable row level security;

-- Policy: Authenticated admins can do everything
create policy "Admins have full access to interviews"
  on public.interviews
  for all
  to authenticated
  using (true)
  with check (true);

-- Policy: Candidates (anon) can read pending non-expired interviews by ID (to load the interview)
create policy "Candidates can read their pending interview"
  on public.interviews
  for select
  to anon
  using (status = 'pending' and expires_at > now());

-- Policy: Candidates (anon) can update interview to complete it
create policy "Candidates can update interview to completed"
  on public.interviews
  for update
  to anon
  using (status = 'pending' and expires_at > now())
  with check (true);

-- Update interviews table with summary column if not exists
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS summary text;

-- Create questions_bank table
create table if not exists public.questions_bank (
  id uuid default gen_random_uuid() primary key,
  job_role text not null,
  department text default 'General',
  sub_department text default 'General',
  question_text text not null,
  is_mandatory boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: Run these if tables already exist:
-- ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS department text DEFAULT 'General';
-- ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS sub_department text DEFAULT 'General';
-- ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS scores jsonb;

-- Enable RLS on questions_bank
alter table public.questions_bank enable row level security;

-- Create policies for questions_bank (allow all for simplicity in admin panel)
create policy "Enable read access for all users on questions_bank"
  on public.questions_bank for select using (true);
create policy "Enable insert for authenticated users only"
  on public.questions_bank for insert with check (true);
create policy "Enable update for authenticated users only"
  on public.questions_bank for update using (true);
create policy "Enable delete for authenticated users only"
  on public.questions_bank for delete using (true);

-- Policy: Public share links can view completed interviews
create policy "Completed interviews are publicly readable"
  on public.interviews
  for select
  to anon
  using (status = 'completed');

-- =================================================
-- Supabase Storage Bucket for interview recordings
-- Run this or create the bucket in the Supabase dashboard
-- =================================================

-- Create storage bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('interview-recordings', 'interview-recordings', true, 524288000) -- 500MB limit
on conflict (id) do nothing;

-- Allow public reading of interview recordings
create policy "Public can read interview recordings"
  on storage.objects
  for select
  to public
  using (bucket_id = 'interview-recordings');

-- Allow anon (candidates) to upload their recordings
create policy "Candidates can upload interview recordings"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'interview-recordings');

-- Allow authenticated (admins) to delete recordings if needed
create policy "Admins can delete recordings"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'interview-recordings');
