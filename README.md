# AI Hiring Platform

An AWS-based hiring workflow with a Next.js frontend, TypeScript Lambda APIs, API Gateway, Cognito, S3, SQS, Textract, DynamoDB, and Terraform.

> **Project status:** implementation is in progress. The cloud stack has not been deployed from this workspace because AWS account access is still required.

## What is implemented

- Terraform packages the TypeScript `jobs`, `applications`, `recruiter`, and `recruiterDashboard` Lambda bundles and defines the protected API routes.
- The recruiter resume URL route is checked before the generic applications route.
- Resume upload and analysis endpoints use the Cognito API Gateway authorizer.
- Application creation verifies the S3 object, candidate/tenant/resume metadata, parse success, and duplicate applications for the same candidate and job.
- Application statuses include `APPLIED`, `PARSING`, `AI_REVIEWED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_RECOMMENDED`, `INTERVIEW_SCHEDULED`, `OFFER`, `HIRED`, and `REJECTED`.
- Recruiter status changes are transition-checked and write audit records.
- Public signup no longer sends a recruiter/admin role or tenant ID from the browser. Privileged roles are resolved from Cognito groups.

## Still required before calling the workflow complete

- Admin invitation/approval API and UI for recruiter creation and tenant claims.
- Public job slug records, unauthenticated careers endpoints/pages, and sharing buttons.
- Move AI scoring into the asynchronous application pipeline and save analysis records by `applicationId` and `jobId`; current analysis is still resume-oriented.
- Remove normal-use demo fallbacks once the deployed API is verified.
- Complete dashboard filtering, interview recommendation view, audit-history UI, and candidate-side processing/error/interview feedback.
- Deploy and run the end-to-end test with one recruiter and one candidate.

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
