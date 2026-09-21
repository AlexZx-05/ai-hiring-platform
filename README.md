# AI Hiring Platform

An AWS-based hiring workflow with a Next.js frontend, TypeScript Lambda APIs, API Gateway, Cognito, S3, SQS, Textract, DynamoDB, and Terraform.

> **Project status:** the core API and UI are implemented in source, but the latest Terraform and Lambda bundles must still be applied to AWS and verified with real accounts.

## What is implemented

- Terraform packages TypeScript Lambdas for jobs, applications, recruiter actions, dashboard, public jobs, invitation, application analysis, and post-confirmation tenant setup.
- API Gateway defines the jobs, applications, recruiter, dashboard, invitation, and public careers routes. The protected API role includes the Cognito `GetUser` permission required by access-token verification.
- The recruiter resume URL route is checked before the generic applications route.
- Self-service signup cannot grant a role or tenant. A Cognito post-confirmation trigger assigns each candidate a private tenant; recruiters are created only through the admin invitation route and Cognito recruiter group.
- Public job identifiers, careers pages, and copy/LinkedIn/WhatsApp/email sharing links are present.
- Application creation verifies the resume object, its metadata/ownership, its ID/key pairing, and duplicate applications. It creates a `PARSING` application; the parse worker then invokes job-specific analysis after parsing.
- AI analysis is generated from the saved application and job description, and is stored under `APPLICATION#{applicationId} / JOB#{jobId}#ANALYSIS#{timestamp}`.
- Application statuses include `APPLIED`, `PARSING`, `AI_REVIEWED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_RECOMMENDED`, `INTERVIEW_SCHEDULED`, `OFFER`, `HIRED`, and `REJECTED`.
- Recruiter status changes are transition-checked and write audit records.
- Recruiter candidate profiles resolve the candidate's private tenant only after proving that candidate applied to one of the recruiter's jobs.

## Still required before calling the workflow complete

- Apply the latest infrastructure. Until this is done, the deployed Lambda role may still lack `cognito-idp:GetUser`, which causes protected frontend requests to return `401` and appear as empty data.
- Remove the legacy standalone `/resume/analyze` browser flow and its UI. It still accepts browser-supplied requirements; the application-analysis Lambda is the intended job-specific path.
- Add a real malware-scan/completion record and gate application analysis on successful scanning. The current upload metadata has only a `PENDING_HOOK` placeholder.
- Replace demo-mode fallbacks after the deployed routes have been verified.
- Finish recruiter filtering/sorting, recommended-interview view, and audit-history display. Notes and pipeline changes exist, but these views need complete UX verification.
- Finish candidate interview scheduling/offer messaging and a persistent candidate-facing resume-processing error view.
- Add automated API/integration tests, then perform the required two-account end-to-end test: recruiter creates and shares a role; candidate signs up, uploads, applies; analysis completes; recruiter reviews and moves to interview; candidate sees the new status.

## Prerequisites

- Node.js 20+, npm, Terraform 1.6+, and AWS CLI v2.
- An authenticated AWS profile permitted to manage this stack.
- An xAI API key stored in AWS Secrets Manager after Terraform creates the secret, if AI scoring is enabled.

Never put AWS access keys, passwords, MFA codes, or AI keys in this repository or chat.

## Local builds

```powershell
cd backend
npm ci
npm run build

cd ../frontend
npm ci
npm run build
npm run dev
```

The backend build creates `backend/.lambda-dist/*`. Terraform packages these artifacts, so rebuild the backend immediately before Terraform plan/apply.

After a successful apply, sign out and sign in again. Existing tokens do not gain new Cognito attributes or group claims until they are refreshed.

## AWS deployment

Authenticate locally with your AWS profile:

```powershell
aws configure sso
aws sts get-caller-identity --profile <your-profile>
```

Then deploy the development environment:

```powershell
cd infrastructure/terraform/environments/dev
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform apply tfplan
terraform output
```

Review the plan before applying: deployment creates billable AWS resources. `backend.hcl` points to the remote Terraform state.

Set the xAI secret after Terraform returns `xai_secret_arn`:

```powershell
aws secretsmanager put-secret-value `
  --secret-id "<xai_secret_arn>" `
  --secret-string '{"XAI_API_KEY":"<your-xai-key>"}' `
  --profile <your-profile>
```

## Frontend configuration

Create `frontend/.env.local` from `frontend/.env.example`, using Terraform outputs:

```env
NEXT_PUBLIC_API_BASE_URL=<api_gateway_invoke_url>
NEXT_PUBLIC_API_GATEWAY_ID=<api_gateway_id>
NEXT_PUBLIC_API_STAGE=dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<cognito_user_pool_id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<cognito_web_client_id>
NEXT_PUBLIC_AWS_REGION=ap-south-1
```

## Repository map

```text
frontend/        Next.js UI and browser API clients
backend/         TypeScript Lambda handlers and shared middleware
infrastructure/  Terraform environments and foundation module
docs/            Architecture and operating documentation
```

See [the deployment runbook](docs/DEPLOYMENT_RUNBOOK.md), [the project structure](docs/PROJECT_STRUCTURE.md), and [the DynamoDB model](docs/DYNAMODB_SINGLE_TABLE.md).
