# Project Structure

This project is split into four main areas: frontend, backend, infrastructure, and docs.

## Root

```text
Ai-Hiring-Platform/
  frontend/
  backend/
  infrastructure/
  docs/
  scripts/
  README.md
```

## Frontend

```text
frontend/
  app/                 Next.js App Router pages and route layouts
  components/          Shared React components
  hooks/               Reusable React hooks
  lib/                 Frontend library setup, such as Amplify config
  services/            Browser API clients and auth helpers
  store/               Frontend state management
  types/               Shared TypeScript types for frontend code
  utils/               Small frontend utility functions
  .env.example         Example public environment variables
```

Important route folders:

```text
frontend/app/
  page.tsx             Public landing page
  signin/              Role-based login
  signup/              Role-based account creation and email verification
  jobs/                Candidate job listing and job details
  applications/        Candidate application tracking
  upload/              Candidate resume upload
  dashboard/           Recruiter dashboard shell
  recruiter/           Recruiter-only job and candidate management
  rankings/            Recruiter ranking screens
```

Frontend services:

```text
frontend/services/
  api.ts               Axios client with auth token injection
  auth.ts              Cognito URLs, token persistence, role helpers
  candidate.ts         Candidate resume analysis API calls
  jobs.ts              Jobs and applications API calls
  recruiter.ts         Recruiter API calls
  upload.ts            Resume upload API calls
```

## Backend

```text
backend/
  lambdas/             AWS Lambda handlers grouped by feature
  shared/              Shared backend utilities, middleware, and types
  layers/              Lambda layer code
  tests/               Backend tests
  dist/                Compiled backend output after npm run build
  .env.example         Example backend runtime environment variables
```

Lambda groups:

```text
backend/lambdas/
  uploadResume/        Creates upload URLs and records resume metadata
  analyzeResume/       Resume analysis workflow
  parseResume/         Resume parsing workflow
  jobs/                Job listing, job detail, and job creation
  applications/        Candidate application APIs
  recruiter/           Recruiter candidate and application APIs
  recruiterDashboard/  Recruiter dashboard summary APIs
  generateQuestions/   AI interview question generation
  auth/                Auth-related Lambda code
```

Shared backend code:

```text
backend/shared/
  dynamodb.ts                      DynamoDB client/helpers
  http.ts                          HTTP response helpers
  middlewares/auth-middleware.ts   Cognito JWT verification and role resolution
  middlewares/with-auth.ts         Lambda auth wrapper
  types/auth.ts                    Auth role/session types
  types/jobs.ts                    Job and application domain types
```

## Infrastructure

```text
infrastructure/
  terraform/
    environments/
      dev/             Development Terraform config
      prod/            Production Terraform config
    modules/
      foundation/      Main reusable AWS foundation module
    api-gateway/       API Gateway-related Terraform
    cognito/           Cognito-related Terraform
    dynamodb/          DynamoDB-related Terraform
    lambda/            Lambda-related Terraform
    s3/                S3-related Terraform
```

## Where To Put New Code

Use these rules when adding features:

```text
New page or route             frontend/app/<route>/page.tsx
Reusable UI                   frontend/components/
Frontend API call             frontend/services/
Frontend-only helper          frontend/utils/ or frontend/lib/
New Lambda feature            backend/lambdas/<feature>/handler.ts
Shared backend logic          backend/shared/
AWS resource change           infrastructure/terraform/
Architecture/setup notes      docs/
```

## Role Ownership

```text
candidate:
  /jobs
  /jobs/[id]
  /applications
  /upload
  /candidates

recruiter:
  /dashboard
  /recruiter/jobs
  /recruiter/jobs/create
  /recruiter/jobs/[id]
  /recruiter/candidates/[id]
  /rankings

admin:
  Can be treated as elevated recruiter access.
```
