-- Migration: Add 3-tier hierarchy (Department -> Sub-department -> Role)

-- 1. Update jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS sub_department text DEFAULT 'General';

-- 2. Update questions_bank table
ALTER TABLE public.questions_bank ADD COLUMN IF NOT EXISTS role text;

-- Migrate data in questions_bank
-- Currently, questions_bank uses sub_department as the role. We move it to role, then reset sub_department.
UPDATE public.questions_bank 
SET role = sub_department 
WHERE role IS NULL;

-- Assign basic sub_departments based on some heuristics (you can adjust these later from UI if needed)
UPDATE public.questions_bank
SET sub_department = 'Development'
WHERE department = 'Technology and Delivery' AND role ILIKE '%dev%' OR role ILIKE '%php%' OR role ILIKE '%frontend%' OR role ILIKE '%backend%';

UPDATE public.questions_bank
SET sub_department = 'Testing'
WHERE department = 'Technology and Delivery' AND role ILIKE '%qa%' OR role ILIKE '%test%';

-- Fallback for anything else in Technology and Delivery
UPDATE public.questions_bank
SET sub_department = 'General'
WHERE department = 'Technology and Delivery' AND (sub_department NOT IN ('Development', 'Testing') OR sub_department IS NULL);

-- Set defaults for remaining
UPDATE public.questions_bank
SET sub_department = 'General'
WHERE sub_department IS NULL OR sub_department = role;

-- 3. Update candidates and interviews to capture unique ID properly
-- (If you want the DB to auto-generate a short ID for candidates, we can add a column)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS unique_id text;

-- Generate a simple unique ID for existing candidates (e.g. KL-XXXX)
UPDATE public.candidates 
SET unique_id = 'KL-' || UPPER(SUBSTRING(id::text FROM 1 FOR 4))
WHERE unique_id IS NULL;
