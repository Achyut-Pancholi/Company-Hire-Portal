-- Migration: Add video_url column to candidates table
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Verify migration worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidates' AND column_name = 'video_url';
