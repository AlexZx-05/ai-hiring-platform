# DynamoDB Single-Table Design

## Table
- Name pattern: `${project}-${env}-core`
- Keys:
  - `PK` (string)
  - `SK` (string)
- GSIs:
  - `GSI1(GSI1PK, GSI1SK)` for recruiter ranking and job queries
  - `GSI2(GSI2PK, GSI2SK)` for skill and tenant search use cases

## Tenant Isolation Strategy
Every record includes `tenantId` and keys are tenant-prefixed:
- `PK = TENANT#{tenantId}#CANDIDATE#{candidateId}`
- `SK = PROFILE | RESUME#{resumeId} | ANALYSIS#{resumeId} | QUESTIONS#{resumeId}`

Recruiter action examples:
- `PK = TENANT#{tenantId}#JOB#{jobId}`
- `SK = CANDIDATE#{candidateId}`

This forces all writes/reads to be tenant-scoped.

## Core Entity Shapes
1. Candidate Profile
- `entityType`: `CANDIDATE_PROFILE`
- includes PII, normalized skills, experience summary

2. Resume Submission
- `entityType`: `RESUME`
- `resumeId`, S3 object key, upload metadata, parse status

3. AI Analysis
- `entityType`: `ANALYSIS`
- `atsScore`, `matchedSkills`, `missingSkills`, `confidence`, `summary`

4. Interview Questions
- `entityType`: `QUESTIONS`
- technical, behavioral, scenario question arrays

5. Recruiter Feedback
- `entityType`: `RECRUITER_ACTION`
- shortlist/reject/override score and notes

## Query Patterns
1. List ranked candidates for a job
- `GSI1PK = TENANT#{tenantId}#JOB#{jobId}`
- `GSI1SK = SCORE#{normalizedScore}#CANDIDATE#{candidateId}`

2. Filter by skill
- `GSI2PK = TENANT#{tenantId}#SKILL#{skill}`
- `GSI2SK = EXPERIENCE#{years}#CANDIDATE#{candidateId}`

3. Candidate drill-down
- Query by `PK = TENANT#{tenantId}#CANDIDATE#{candidateId}`

## Write Rules
- Never write records without `tenantId`.
- Never query without tenant-scoped key prefix.
- Keep analysis versioned: `ANALYSIS#{resumeId}#v#{n}` for model updates.
