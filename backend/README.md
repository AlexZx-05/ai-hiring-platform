# Backend

TypeScript AWS Lambda backend for the AI Hiring Platform.

## Build

```powershell
npm install
npm run build
```

Compiled files are written to `dist/`.

## Folder Guide

```text
lambdas/   Lambda handlers grouped by feature
shared/    Shared backend utilities, middleware, and types
layers/    Lambda layer code
tests/     Backend tests
dist/      Build output
```

## Lambda Groups

```text
lambdas/uploadResume/          Resume upload URL and metadata flow
lambdas/analyzeResume/         Resume analysis flow
lambdas/parseResume/           Resume parsing flow
lambdas/jobs/                  Job listing and recruiter job creation
lambdas/applications/          Candidate applications
lambdas/recruiter/             Recruiter candidate/application APIs
lambdas/recruiterDashboard/    Recruiter dashboard summaries
lambdas/generateQuestions/     AI interview question generation
lambdas/auth/                  Auth-related backend code
```

## Shared Code

```text
shared/dynamodb.ts                      DynamoDB helpers
shared/http.ts                          HTTP response helpers
shared/middlewares/auth-middleware.ts   Cognito JWT verification
shared/middlewares/with-auth.ts         Lambda auth wrapper
shared/types/                           Shared backend types
```

## Auth Requirements

The backend expects Cognito JWT claims with:

```text
custom:role
custom:tenantId
```

Allowed roles:

```text
candidate
recruiter
admin
```
