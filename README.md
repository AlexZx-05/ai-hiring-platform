# AI Hiring Platform

An AWS-based hiring workflow with a Next.js frontend, TypeScript Lambda APIs, API Gateway, Cognito, S3, DynamoDB, and Terraform.

> **Project status:** the core API and UI are implemented in source, but the latest Terraform and Lambda bundles must still be applied to AWS and verified with real accounts.

## What is implemented

- Terraform packages TypeScript Lambdas for jobs, applications, recruiter actions, dashboard, public jobs, invitation, application analysis, and post-confirmation tenant setup.
- API Gateway defines the jobs, applications, resume upload/analysis, recruiter, dashboard, invitation, and public careers routes. The protected API role includes the Cognito `GetUser` permission required by access-token verification.
- The recruiter resume URL route is checked before the generic applications route.
- Self-service signup cannot grant a role or tenant. A Cognito post-confirmation trigger assigns each candidate a private tenant; recruiters are created only through the admin invitation route and Cognito recruiter group.
- Public job identifiers, careers pages, and copy/LinkedIn/WhatsApp/email sharing links are present.
- PDF.js extracts selectable PDF text in the candidate's browser; no Amazon Textract request is made for new uploads. Scanned/image-only PDFs are rejected with a clear message because OCR is intentionally not configured.
- Standalone resume text is sent to the authenticated API and stored under the candidate's resume record in DynamoDB after the API verifies the candidate owns the uploaded S3 object. Job applications store the application, extracted text, and successful parse status atomically, then invoke job-specific analysis.
- Application creation verifies the resume object, its metadata/ownership, its ID/key pairing, and duplicate applications. Recruiter review continues to use the saved application analysis.
- Job-specific analysis claims a short DynamoDB lease and only analyzes applications without a saved score, preventing duplicate async triggers from making concurrent LLM calls.
- AI analysis is generated from the saved application and job description, and is stored under `APPLICATION#{applicationId} / JOB#{jobId}#ANALYSIS#{timestamp}`.
- Candidates can also upload a PDF and request a private, evidence-based resume review against a pasted job description through `/resume/analyze`. The report includes a weighted alignment score, requirement evidence, relevant strengths, skills not evidenced, constructive improvement tips, and an advisory apply-next-step; this one-off review is separate from a saved application review.
- The standalone review reuses the latest saved result only when the effective resume text, job description, model, and prompt version match. It stores only a SHA-256 input key alongside the analysis record, not another copy of the resume text.
- The standalone analyzer makes one structured request to the configured AI provider, caps the response size, and times out the provider call after 20 seconds. Development defaults to Groq; its free-tier access and quotas are controlled by Groq and can change. Production remains configured for xAI by default.
- Analysis remains a single complete JSON response rather than SSE: the UI renders only validated, structured results and never presents partial JSON as a finished report.
- New standalone resume reviews extract selectable text locally before submission; only older uploads may still be waiting on the legacy background parser and should be uploaded again to use browser extraction.
- Application statuses include `APPLIED`, `PARSING`, `AI_REVIEWED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_RECOMMENDED`, `INTERVIEW_SCHEDULED`, `OFFER`, `HIRED`, and `REJECTED`.
- Job-specific application analysis is attached to the application for recruiter review; the recruiter controls all application-status decisions, and the AI score is not an automatic rejection or hiring decision.
- Recruiter status changes are transition-checked and write audit records.
- Recruiter candidate profiles resolve the candidate's private tenant only after proving that candidate applied to one of the recruiter's jobs.

## Still required before calling the workflow complete

- Apply the latest infrastructure. Until this is done, the deployed Lambda role may still lack `cognito-idp:GetUser`, which causes protected frontend requests to return `401` and appear as empty data.
- Add a real malware-scan/completion record and gate application analysis on successful scanning. The current upload metadata has only a `PENDING_HOOK` placeholder.
- Replace demo-mode fallbacks after the deployed routes have been verified.
- Finish recruiter filtering/sorting, recommended-interview view, and audit-history display. Notes and pipeline changes exist, but these views need complete UX verification.
- Finish candidate interview scheduling/offer messaging and a persistent candidate-facing resume-processing error view.
- Add automated API/integration tests, then perform the required two-account end-to-end test: recruiter creates and shares a role; candidate signs up, uploads, applies; analysis completes; recruiter reviews and moves to interview; candidate sees the new status.
- Deploy the updated API Lambdas and Terraform before testing. Terraform removes the S3-to-SQS and parser event mappings so new PDF uploads no longer invoke Textract.
- After deployment, compare the `Resume analysis completed` CloudWatch durations across representative PDFs. Source changes alone do not establish a live before/after latency improvement.

## Prerequisites

- Node.js 20+, npm, Terraform 1.6+, and AWS CLI v2.
- An authenticated AWS profile permitted to manage this stack.
- An AI provider API key stored in AWS Secrets Manager after Terraform creates the secret. Development defaults to Groq's compatible endpoint and `openai/gpt-oss-120b`, a documented replacement for the retired `llama-3.3-70b-versatile`; provider access and quotas can change.

Never put AWS access keys, passwords, MFA codes, or AI keys in this repository or chat.

## Development AI provider setup

The development environment is configured for Groq, not xAI. Create a new Groq API key and save it in AWS Secrets Manager in the existing secret `ai-hiring-platform/dev/xai-api` (the secret has a legacy name). Store it as JSON:

```json
{"GROQ_API_KEY":"<your-new-groq-key>"}
```

Do not put the key in source code, Terraform variables, or chat. Groq may enforce free-tier rate limits or change model availability; the application will display a useful message if a key is rejected or a quota is reached.

## Local builds

```powershell
cd backend
npm ci
LENOVO@Alex MINGW64 ~/Desktop/Ai-Hiring-Platform/frontend (main)
$ npm run build

> frontend@0.1.0 build
> next build

▲ Next.js 16.2.6 (Turbopack)
- Environments: .env.local, .env

  Creating an optimized production build ...
✓ Compiled successfully in 118s
  Running TypeScript  .Failed to type check.

.next/dev/types/validator.ts:62:1
Type error: Cannot find name 'eck'.

  60 |   type __Unused = __Check
  61 | }
> 62 | eck = __IsExpected<typeof handler>
     | ^
  63 |   // @ts-ignore
  64 |   type __Unused = __Check
  65 | }
Next.js build worker exited with code: 1 and signal: null
npm notice
npm notice New major version of npm available! 10.8.2 -> 12.2.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.0
npm notice To update run: npm install -g npm@12.2.0
npm notice
cd ../frontend
npm ci
npm run build
npm run dev
```

The backend build creates `backend/.lambda-dist/*`. Terraform packages these artifacts, so rebuild the backend immediately before Terraform plan/apply.

After a successful apply, sign out and sign in again. Existing tokens do not gain new Cognito attributes or group claims until they are refreshed. The protected resume-analysis endpoint needs both a valid Cognito ID token in `Authorization` and access token in `X-Cognito-Access-Token`; the deployed analysis Lambda role must also include `cognito-idp:GetUser`.

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

After Terraform creates the secret, set its value in the AWS Secrets Manager console as described in [Development AI provider setup](#development-ai-provider-setup). For dev, use a `GROQ_API_KEY` JSON property; production remains configured for xAI by default.

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
