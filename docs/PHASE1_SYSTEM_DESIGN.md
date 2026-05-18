# PHASE 1 - SYSTEM DESIGN FIRST

## Objective
Design the end-to-end architecture for an AI Resume Screening and Interview Platform before implementation.

## System Scope
The platform supports two primary personas:
- Candidate: uploads resume and views submission status
- Recruiter: reviews ranked candidates, ATS scores, and AI-generated insights

Core outcomes:
- Automated resume parsing and analysis
- Role-based candidate ranking
- AI-generated interview questions
- Recruiter dashboard for decision support

## High-Level Architecture

```text
Frontend (Next.js/React)
  -> API Gateway (REST, JWT Authorizer)
      -> Lambda: Auth/Profile APIs
      -> Lambda: Upload API (pre-signed URL)
      -> Lambda: Recruiter Dashboard APIs

Candidate Upload Flow
Frontend -> API Gateway -> Upload Lambda -> S3 (resume bucket)
S3 ObjectCreated Event -> Parse Lambda -> Textract
Parse Lambda -> Structured JSON -> DynamoDB
Parse Lambda -> Analyze Lambda (or EventBridge trigger)
Analyze Lambda -> Bedrock (ATS, summary, skill match)
Analyze Lambda -> DynamoDB (scores, insights, ranking factors)
Analyze Lambda -> GenerateQuestions Lambda -> Bedrock
GenerateQuestions Lambda -> DynamoDB (question sets)

Recruiter Query Flow
Frontend -> API Gateway -> RecruiterDashboard Lambda -> DynamoDB
                                  -> optional S3 (reports)
```

## AWS Service Responsibilities
- CloudFront: CDN for frontend assets and low-latency delivery
- S3: resume object storage and optional generated reports
- API Gateway: secure REST entry point and routing
- Cognito: user auth, JWT issuance, role/group management (recruiter/candidate)
- Lambda: serverless business logic and orchestration
- Textract: resume text extraction from PDF/DOCX
- Bedrock: ATS scoring, evaluation, summary, interview question generation
- DynamoDB: candidate records, scores, question sets, recruiter actions
- EventBridge (recommended): decoupled async event routing between pipeline stages
- CloudWatch: logs, metrics, alarms
- IAM + KMS: least-privilege access and encryption controls

## Backend Service Boundaries (Lambda Domains)
- `uploadResume`: issues pre-signed upload URL, validates file metadata
- `parseResume`: starts/extracts Textract output and normalizes schema
- `analyzeResume`: calls Bedrock, computes ATS and compatibility metrics
- `generateQuestions`: creates role-specific interview question sets
- `recruiterDashboard`: candidate list, filtering, sorting, search APIs
- `auth`: optional profile/role endpoints integrated with Cognito

## Data Model (DynamoDB)
Single-table design (recommended): `HiringPlatformTable`

Primary keys:
- `PK` (partition key)
- `SK` (sort key)

Suggested entities:
- Candidate profile: `PK=CANDIDATE#{candidateId}`, `SK=PROFILE`
- Resume submission: `PK=CANDIDATE#{candidateId}`, `SK=RESUME#{resumeId}`
- Analysis result: `PK=CANDIDATE#{candidateId}`, `SK=ANALYSIS#{resumeId}`
- Interview questions: `PK=CANDIDATE#{candidateId}`, `SK=QUESTIONS#{resumeId}`
- Recruiter shortlist action: `PK=RECRUITER#{recruiterId}`, `SK=SHORTLIST#{candidateId}`

GSIs:
- `GSI1` for role/job-based ranking query: `GSI1PK=JOB#{jobId}`, `GSI1SK=ATS#{score}`
- `GSI2` for skill search: `GSI2PK=SKILL#{skill}`, `GSI2SK=EXPERIENCE#{years}`

## API Design (Phase 1 Contracts)
- `POST /upload/url` -> get pre-signed S3 URL
- `POST /upload/complete` -> register uploaded resume metadata
- `GET /candidates` -> recruiter list with filters (skill, score, experience)
- `GET /candidates/{id}` -> candidate details + AI insights
- `POST /candidates/{id}/shortlist` -> shortlist action
- `GET /candidates/{id}/questions` -> AI-generated interview questions

AuthN/AuthZ:
- JWT via Cognito user pools
- Recruiter-only routes enforced via API Gateway authorizer + Lambda checks

## Processing Workflow Design
1. Candidate authenticates via Cognito
2. Candidate requests pre-signed URL and uploads resume to S3
3. S3 event triggers `parseResume`
4. `parseResume` extracts text/sections via Textract and stores normalized payload
5. `analyzeResume` invokes Bedrock for ATS and fit scoring
6. `generateQuestions` builds personalized interview question set
7. Results persisted to DynamoDB and exposed to recruiter APIs

## Security & Compliance Baseline
- Encrypt S3, DynamoDB, and logs using KMS-managed keys
- Least-privilege IAM per Lambda
- Signed URLs with short expiry and content-type restrictions
- Block public S3 access
- PII handling controls for resumes/contact fields
- Auditability via CloudWatch + CloudTrail

## Reliability & Scalability Decisions
- Fully serverless for auto-scaling and pay-per-use
- Async event-driven pipeline to avoid API timeouts
- Idempotency keys for upload/analysis stages
- Dead-letter queues (SQS DLQ) for failed Lambda executions
- Retries/backoff for Textract and Bedrock calls

## Observability Plan
- Structured JSON logs with correlation IDs (`requestId`, `candidateId`, `resumeId`)
- CloudWatch alarms for Lambda errors, throttles, and latency
- Custom metrics: parse success rate, analysis duration, question generation success

## Terraform Layout Mapping
- `infrastructure/terraform/lambda`: Lambda definitions and IAM roles
- `infrastructure/terraform/s3`: resume bucket, lifecycle, notifications
- `infrastructure/terraform/dynamodb`: table + GSIs
- `infrastructure/terraform/cognito`: user pool, app client, groups
- `infrastructure/terraform/api-gateway`: routes, authorizer, integrations
- `infrastructure/terraform/cloudfront`: CDN + origin configuration
- `infrastructure/terraform/modules`: reusable module abstractions
- `infrastructure/terraform/environments/dev|prod`: env-specific variables/state

## Phase 1 Deliverables
- Finalized service architecture and event flow
- API contract draft
- DynamoDB access pattern validation
- Security baseline decisions
- Terraform module boundaries and environment strategy

## Out of Scope (Phase 1)
- UI implementation
- Full Lambda business logic implementation
- Production hardening details (WAF tuning, SOC workflows)

## Next Step After Approval
Phase 2: Bootstrap Terraform modules and backend Lambda skeletons aligned to this design.
