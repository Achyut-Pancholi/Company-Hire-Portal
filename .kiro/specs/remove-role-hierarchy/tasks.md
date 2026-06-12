# Implementation Plan: Remove Role Hierarchy

## Overview

This plan refactors the KL Hire Interview platform from a three-tier hierarchy (Department → Sub-Department → Role) to a two-tier hierarchy (Department → Sub-Department). Tasks are ordered by dependency: database migration first, then types, then APIs, then UI, and finally seed data cleanup.

## Tasks

- [x] 1. Database migration and schema update
  - [x] 1.1 Create SQL migration file to remove role hierarchy
    - Create `supabase/migrations/YYYYMMDD_remove_role_hierarchy.sql`
    - Add `department` and `sub_department` columns to `interviews` table (IF NOT EXISTS)
    - Backfill `interviews.department` and `interviews.sub_department` from `jobs` table using `job_role → title` match
    - Set defaults (`'General'`) for any unmatched rows
    - Drop `job_role` column from `questions_bank` (IF EXISTS)
    - Drop `job_role` column from `interviews` (IF EXISTS)
    - Consolidate `jobs` table: deduplicate rows sharing same `department + sub_department`, keep earliest `created_at`
    - Normalize `jobs`: set `sub_department = title` where null, then `title = sub_department`
    - Ensure idempotency with `IF EXISTS`/`IF NOT EXISTS` guards
    - _Requirements: 1.3, 1.4, 1.5, 2.2, 2.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.2 Update `master_schema.sql` to reflect post-migration schema
    - Remove `job_role` column from `questions_bank` table definition
    - Remove `job_role` column from `interviews` table definition
    - Ensure `interviews` has `department` and `sub_department` columns (NOT NULL, default `'General'`)
    - Ensure `jobs` table has `sub_department` column alongside `title`
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.4_

- [x] 2. Update TypeScript types
  - [x] 2.1 Update `src/types/index.ts` to remove `job_role` and ensure `department`/`sub_department` exist
    - Remove `job_role` property from the `Interview` interface
    - Remove `job_role` property from `CreateInterviewInput` interface (if present)
    - Ensure `department: string` and `sub_department: string` are present on `Interview` interface
    - Ensure `department: string` and `sub_department: string` are present on `CreateInterviewInput` interface
    - Remove any other type/interface that references `job_role`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 3. Update API layer
  - [x] 3.1 Update Questions API (`src/app/api/questions/route.ts`)
    - Remove `job_role` from insert payload in POST handler
    - Require `sub_department` in POST validation; return 400 if missing
    - Remove any `job_role` references from GET query ordering/filtering
    - Order results by `department` + `sub_department`
    - _Requirements: 3.1, 3.4_

  - [x] 3.2 Update Invite API (`src/app/api/invites/send/route.ts`)
    - Remove `role` from required fields validation
    - Fetch questions by `.eq("sub_department", sub_department)` instead of matching on role
    - Create interview record with `department` + `sub_department` (no `job_role`)
    - Pass `sub_department` as the position identifier to email service call
    - Return 400 if `department` or `sub_department` is missing
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.3 Update Interviews API (`src/app/api/interviews/route.ts`)
    - Accept `department` + `sub_department` instead of `job_role` in POST body
    - Validate presence of `department` and `sub_department`; return 400 if missing
    - Remove any `job_role` reference from insert or select queries
    - _Requirements: 4.2_

  - [x] 3.4 Update Email Service (`src/app/api/emails/send/route.ts`)
    - Rename internal `jobRole` parameter to `position` for clarity
    - Use `sub_department` value as position display in invite email subject and body
    - Use `sub_department` value as position display in completion notification email
    - Ensure email subject line uses `sub_department` where `job_role` was previously used
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ]* 3.5 Write property tests for API changes
    - **Property 1: Question creation stores dept + sub_dept without job_role**
    - **Property 2: Question fetch by sub_department returns correct set**
    - **Property 3: Filter returns only matching records**
    - **Property 4: Missing sub_department rejects with 400**
    - **Property 5: Interview stores dept/sub_dept without job_role**
    - **Property 6: Role parameter is ignored in invite requests**
    - **Property 7: Email templates use sub_department as position**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.4, 6.1, 6.2, 6.5**

- [x] 4. Checkpoint - Verify API layer compiles and passes tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update Admin UI components
  - [x] 5.1 Update QuestionBankModal (`src/components/admin/QuestionBankModal.tsx`)
    - Remove the third "Role" dropdown from the add-question form
    - Remove the role filter dropdown from the filter controls
    - Remove `newRole`, `selectedRole` state variables
    - Remove `getAvailableRoles()` helper function
    - Change grid layout from 3-column to 2-column (Department → Sub-Department only)
    - _Requirements: 5.1, 5.5_

  - [x] 5.2 Update Video Bot Admin invite panel (`src/app/video-bot-admin/dashboard/`)
    - Remove `inviteRole` state variable and role dropdown
    - Remove `getAvailableRoles()` helper
    - Update invite send handler to pass only `department` + `sub_department`
    - Change dropdown layout to 2-tier (Department → Sub-Department)
    - _Requirements: 5.2_

  - [x] 5.3 Update Candidates page (`src/app/admin/candidates/`)
    - Remove `selectedRole` filter state
    - Remove role dropdown from the filter bar
    - Remove any role column from the candidates table
    - _Requirements: 5.3, 5.4_

  - [x] 5.4 Update Job Postings page (`src/app/admin/jobpostings/`)
    - Remove role-specific creation/editing UI
    - Show only department + sub-department pairs
    - _Requirements: 2.1_

  - [x] 5.5 Update Interview Dashboard tables (`src/app/video-bot-admin/dashboard/`)
    - Remove "Role" column from interview listing tables
    - Display `sub_department` as position where needed
    - _Requirements: 5.3_

- [x] 6. Update candidate-facing pages
  - [x] 6.1 Update Interview page (`src/app/interview/[id]/page.tsx`)
    - Display `department` and `sub_department` where `job_role` was previously shown
    - Remove any reference to `job_role` from the interview detail display
    - _Requirements: 6.3_

  - [x] 6.2 Update Share page (`src/app/share/[token]/page.tsx`)
    - Display `department` and `sub_department` instead of `job_role`
    - Remove any role label from the shared report
    - _Requirements: 6.4_

- [x] 7. Checkpoint - Verify full application compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update seed data and cleanup
  - [x] 8.1 Update `seed_defaults.js`
    - Ensure each job entry sets both `title` and `sub_department` to the same sub-department value
    - Insert rows as department + sub-department pairs, not individual roles
    - _Requirements: 2.1, 2.4_

  - [x] 8.2 Remove any remaining `job_role` references across the codebase
    - Search for `job_role` and `jobRole` in all source files
    - Remove or replace any remaining references
    - Ensure TypeScript build passes cleanly with zero `job_role` references
    - _Requirements: 8.3_

- [x] 9. Final checkpoint - Full build and test verification
  - Ensure all tests pass, ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1.1", "1.2"],
      "description": "Database migration and schema update"
    },
    {
      "wave": 2,
      "tasks": ["2.1"],
      "description": "Update TypeScript types"
    },
    {
      "wave": 3,
      "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5"],
      "description": "Update API layer"
    },
    {
      "wave": 4,
      "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "6.1", "6.2"],
      "description": "Update UI components and candidate-facing pages"
    },
    {
      "wave": 5,
      "tasks": ["8.1", "8.2"],
      "description": "Seed data and cleanup"
    }
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The migration must be run before any code changes are deployed since the API layer expects the new schema
