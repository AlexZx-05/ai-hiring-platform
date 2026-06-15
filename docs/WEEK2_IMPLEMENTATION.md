# Week 2 Implementation

## Delivered in Code
- Cognito auth wiring aligned to environment-based configuration
- Role-protected frontend routes:
  - `/upload`: candidate/admin
  - `/candidates`, `/analytics`: recruiter/admin
- Resume upload UX at `frontend/app/upload/page.tsx`
- Upload service calls:
  - `POST /upload/url` to request pre-signed URL
  - direct `PUT` to S3 with signed URL
- Backend Lambda added:
  - `backend/lambdas/uploadResume/handler.ts`
  - validates content type and max file size (5MB)
  - creates tenant-scoped object key
  - returns pre-signed upload URL
- Backend auth context enforces `tenantId` claim (`custom:tenantId`) and rejects missing claims
- Upload URL issuance restricted to `candidate` and `admin`
- Malware scan hook placeholder added in upload response + S3 object metadata (`scanstatus=pending`)
- Signup now captures `tenantId` and writes `custom:tenantId` into Cognito user attributes

## Required AWS Wiring (Next)
To make the flow live in AWS, connect these resources in Terraform:
1. Lambda deployment for `uploadResume`
2. API Gateway route `POST /upload/url` integrated with `uploadResume`
3. IAM policy allowing `s3:PutObject` signing context (bucket scope)
4. Lambda env vars:
   - `AWS_REGION`
   - `RESUME_BUCKET_NAME`
   - `COGNITO_REGION`
   - `COGNITO_USER_POOL_ID`
   - `COGNITO_CLIENT_ID`

## Frontend Env Requirements
Set these in `frontend/.env.local`:
- `NEXT_PUBLIC_COGNITO_REGION`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `NEXT_PUBLIC_COGNITO_DOMAIN`
- `NEXT_PUBLIC_COGNITO_AUTHORITY` (optional if computed)
- `NEXT_PUBLIC_API_GATEWAY_ID` or `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_STAGE` (default `dev`)
