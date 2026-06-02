-- Add sender_email column to interviews table to store the original sender of the invite
-- This ensures completion emails are sent to the original sender
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS sender_email text;
