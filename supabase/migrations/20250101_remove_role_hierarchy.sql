-- =================================================
-- Migration: Remove Role Hierarchy
-- Simplifies three-tier (Department → Sub-Department → Role) to two-tier (Department → Sub-Department)
-- This migration is idempotent and safe to re-run.
-- =================================================

-- Step 0: Ensure jobs table has sub_department column
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS sub_department text;

-- Step 1: Add department/sub_department to interviews (backfill before dropping job_role)
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS sub_department text;

-- Backfill interviews from jobs table using job_role → title match
UPDATE public.interviews i
SET department = j.department,
    sub_department = COALESCE(j.sub_department, j.title)
FROM public.jobs j
WHERE i.job_role = j.title
  AND i.department IS NULL;

-- For any interviews that didn't match, set defaults
UPDATE public.interviews
SET department = COALESCE(department, 'General'),
    sub_department = COALESCE(sub_department, job_role, 'General')
WHERE department IS NULL OR sub_department IS NULL;

-- Step 2: Drop job_role columns
ALTER TABLE public.questions_bank DROP COLUMN IF EXISTS job_role;
ALTER TABLE public.interviews DROP COLUMN IF EXISTS job_role;

-- Step 3: Normalize jobs - set sub_department = title where null
UPDATE public.jobs SET sub_department = title WHERE sub_department IS NULL;
-- Set title = sub_department for consistency
UPDATE public.jobs SET title = sub_department;

-- Step 4: Consolidate jobs table - keep one row per dept+sub_dept (earliest created_at)
DELETE FROM public.jobs
WHERE id NOT IN (
  SELECT DISTINCT ON (department, sub_department)
    id
  FROM public.jobs
  ORDER BY department, sub_department, created_at ASC
);
