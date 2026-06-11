# Requirements Document

## Introduction

This document specifies the requirements for removing the "Role" tier from the organizational hierarchy in the KL Hire Interview platform. The current hierarchy is Department → Sub-Department → Role, and it will be simplified to Department → Sub-Department. This is a comprehensive refactoring that affects the database schema, API layer, TypeScript types, and all UI components that reference roles.

## Glossary

- **System**: The KL Hire Interview platform (Next.js + Supabase application)
- **Questions_Bank**: The database table storing interview questions, currently linked to roles via `job_role` column
- **Interviews_Table**: The database table storing interview records, currently containing a `job_role` column
- **Jobs_Table**: The database table where each row currently represents a role (via `title`) within a department/sub-department pairing
- **Admin_UI**: The administrative interface used by hiring managers to manage questions, send invites, and review candidates
- **Invite_API**: The API endpoint responsible for creating interviews and sending invite emails to candidates
- **Questions_API**: The API endpoint responsible for CRUD operations on the question bank
- **Interviews_API**: The API endpoint responsible for creating and listing interview records
- **Email_Service**: The API endpoint responsible for composing and sending email notifications to candidates
- **Candidate_View**: The public-facing pages where candidates view interview details and shared reports

## Requirements

### Requirement 1: Remove job_role from Database Schema

**User Story:** As a system administrator, I want the `job_role` column removed from the `questions_bank` and `interviews` tables, so that the schema reflects the simplified two-tier hierarchy.

#### Acceptance Criteria

1. THE System SHALL NOT include a `job_role` column in the `questions_bank` table schema
2. THE System SHALL NOT include a `job_role` column in the `interviews` table schema
3. WHEN the database migration runs, THE System SHALL drop the `job_role` column from the `questions_bank` table
4. WHEN the database migration runs, THE System SHALL drop the `job_role` column from the `interviews` table
5. WHEN the database migration runs, THE System SHALL preserve all existing data in other columns of both tables

### Requirement 2: Refactor Jobs Table to Represent Sub-Departments

**User Story:** As a system administrator, I want the `jobs` table to represent department/sub-department pairings directly rather than individual roles, so that the data model matches the simplified hierarchy.

#### Acceptance Criteria

1. THE Jobs_Table SHALL use rows to represent unique department and sub_department combinations rather than individual role titles
2. WHEN the migration runs, THE System SHALL consolidate existing job rows that share the same department and sub_department into a single representative row
3. THE Jobs_Table SHALL retain the `department` and `sub_department` columns as the primary organizational identifiers
4. IF the `title` column is retained for backward compatibility, THEN THE System SHALL treat it as a label for the sub-department rather than as a role identifier

### Requirement 3: Link Questions to Sub-Department

**User Story:** As a hiring manager, I want questions to be associated with a sub-department instead of a role, so that all candidates interviewing within a sub-department receive the same question set.

#### Acceptance Criteria

1. WHEN a question is created, THE Questions_API SHALL associate it with a `department` and `sub_department` combination
2. WHEN questions are fetched for an interview, THE Invite_API SHALL query the Questions_Bank by `sub_department` instead of by role
3. WHEN questions are listed in the admin interface, THE Admin_UI SHALL group and filter questions by department and sub-department only
4. THE Questions_API SHALL reject question creation requests that do not include a valid `sub_department` value

### Requirement 4: Update Invite and Interview Creation

**User Story:** As a hiring manager, I want to send interview invites by selecting only a department and sub-department, so that the invite workflow is simpler and questions are fetched by sub-department.

#### Acceptance Criteria

1. WHEN an invite is sent, THE Invite_API SHALL fetch questions by matching `sub_department` in the Questions_Bank
2. WHEN an interview record is created, THE Interviews_API SHALL store `department` and `sub_department` without a `job_role` field
3. WHEN an invite request is missing `department` or `sub_department`, THE Invite_API SHALL return a 400 error with a descriptive message
4. THE Invite_API SHALL NOT require or validate a `role` parameter in the request body

### Requirement 5: Remove Role Dropdowns and Filters from UI

**User Story:** As a hiring manager, I want all role selection dropdowns and role-based filters removed from the admin interface, so that the UI reflects the two-tier hierarchy.

#### Acceptance Criteria

1. THE Admin_UI SHALL present a two-tier cascading dropdown (Department → Sub-Department) in the Question Bank Manager instead of three tiers
2. THE Admin_UI SHALL present a two-tier cascading dropdown (Department → Sub-Department) in the Send Video Invite panel instead of three tiers
3. THE Admin_UI SHALL NOT display a "Role" column in the interview dashboard table
4. THE Admin_UI SHALL NOT include role-based filter options in the candidates listing page
5. WHEN filtering existing questions, THE Admin_UI SHALL provide filter controls for department and sub-department only

### Requirement 6: Update Display Text in Emails and Public Pages

**User Story:** As a candidate, I want emails and interview pages to show the department and sub-department instead of a role name, so that the information is accurate after the hierarchy change.

#### Acceptance Criteria

1. WHEN sending an invite email, THE Email_Service SHALL display `sub_department` as the position identifier instead of `job_role`
2. WHEN sending a completion notification email, THE Email_Service SHALL reference the `sub_department` as the position
3. WHEN displaying interview details on the candidate interview page, THE Candidate_View SHALL show department and sub-department without any role label
4. WHEN displaying the shared interview report, THE Candidate_View SHALL show department and sub-department without any role label
5. THE Email_Service SHALL use `sub_department` in the email subject line where `job_role` was previously used

### Requirement 7: Database Migration

**User Story:** As a system administrator, I want a safe database migration that removes role columns and refactors the jobs table, so that the schema change can be applied to existing production data without data loss.

#### Acceptance Criteria

1. THE System SHALL provide a SQL migration script that drops the `job_role` column from `questions_bank`
2. THE System SHALL provide a SQL migration script that drops the `job_role` column from `interviews`
3. THE System SHALL provide a SQL migration script that consolidates duplicate rows in the `jobs` table (rows sharing department + sub_department)
4. WHEN the migration is applied, THE System SHALL NOT delete or corrupt data in columns unrelated to the role removal
5. THE migration script SHALL be idempotent, allowing safe re-execution without errors

### Requirement 8: Update TypeScript Types

**User Story:** As a developer, I want all TypeScript interfaces updated to remove `job_role` references, so that the type system enforces the new schema at compile time.

#### Acceptance Criteria

1. THE System SHALL NOT include a `job_role` property in the `Interview` TypeScript interface
2. THE System SHALL NOT include a `job_role` property in the `CreateInterviewInput` TypeScript interface
3. WHEN a developer references the removed `job_role` field, THE TypeScript compiler SHALL produce a compile-time error
4. THE System SHALL add `department` and `sub_department` properties to the `Interview` interface if they are not already present
