# Deployment Runbook

## 1. Store the xAI key

After Terraform creates the secret, set the secret value in AWS Secrets Manager:

```powershell
aws secretsmanager put-secret-value `
  --secret-id "<xai_secret_arn_from_terraform_output>" `
  --secret-string '{"XAI_API_KEY":"<rotated-xai-key>"}'
```

Do not commit real keys. If you need a local Terraform variable file, create a `*.auto.tfvars` file; those files are ignored by Git.

## 2. Build Lambda deployment bundles

The jobs, applications, recruiter, and dashboard Lambdas are bundled from the
TypeScript backend. Build them before every Terraform plan or apply:

```powershell
cd backend
npm ci
npm run build
```

This creates ignored `backend/.lambda-dist/*` artifacts that Terraform packages
into the Lambda ZIP files. Do not deploy stale bundles.

## 3. Deploy infrastructure

```powershell
cd infrastructure/terraform/environments/dev
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
terraform output
```

## 4. Configure the frontend

Use Terraform outputs to update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=<api_gateway_invoke_url>
NEXT_PUBLIC_API_GATEWAY_ID=<api_gateway_id>
NEXT_PUBLIC_API_STAGE=dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<cognito_user_pool_id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<cognito_web_client_id>
```

## 5. Test the flow

1. Sign in as recruiter and create an open job.
2. Sign in as candidate and open the job description.
3. Upload a PDF resume and submit the application.
4. Wait for resume parsing to complete.
5. Open recruiter leaderboard and verify AI score, matched skills, missing skills, and candidate ranking.
6. Open the job applicant page, view the resume, then shortlist or reject the candidate.

## 6. Notifications

Set `NOTIFICATION_WEBHOOK_URL` on the recruiter API Lambda environment if you want status-change notifications. The webhook receives `APPLICATION_STATUS_CHANGED` events for `SHORTLISTED` and `REJECTED` statuses.
