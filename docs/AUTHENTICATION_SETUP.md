# Authentication Setup

The app uses AWS Cognito for:

- Email/password sign up and sign in
- Email verification
- Hosted UI sign in
- Role-based routing
- API authorization through JWT tokens

## Required Cognito Configuration

Create or verify these Cognito settings in the User Pool.

Required custom attributes:

```text
custom:role
custom:tenantId
```

The frontend sign-up page writes:

```text
custom:role      candidate | recruiter
custom:tenantId  company or tenant identifier
```

The backend accepts these roles:

```text
candidate
recruiter
admin
```

## App Client Requirements

The Cognito app client must allow:

```text
Username/password sign in
Authorization code OAuth flow
openid scope
email scope
aws.cognito.signin.user.admin scope
Callback URL: http://localhost:3000/login
Logout URL:   http://localhost:3000/login
```

For deployed environments, add the deployed frontend domain to the callback and logout URL lists.

## Frontend Environment Variables

Configure these in `frontend/.env.local`:

```text
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_COGNITO_REGION=ap-south-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<user-pool-id>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<app-client-id>
NEXT_PUBLIC_COGNITO_AUTHORITY=https://cognito-idp.<region>.amazonaws.com/<user-pool-id>
NEXT_PUBLIC_COGNITO_DOMAIN=https://<domain-prefix>.auth.<region>.amazoncognito.com
NEXT_PUBLIC_COGNITO_REDIRECT_URI=http://localhost:3000/login
NEXT_PUBLIC_COGNITO_LOGOUT_REDIRECT_URI=http://localhost:3000/login
NEXT_PUBLIC_API_GATEWAY_ID=<api-gateway-id>
NEXT_PUBLIC_API_STAGE=dev
NEXT_PUBLIC_API_BASE_URL=https://<api-gateway-id>.execute-api.<region>.amazonaws.com/dev
```

## Backend Environment Variables

Configure these for Lambda runtime or local backend testing:

```text
AWS_REGION=<region>
COGNITO_REGION=<region>
COGNITO_USER_POOL_ID=<user-pool-id>
COGNITO_CLIENT_ID=<app-client-id>
DYNAMODB_TABLE_NAME=<table-name>
RESUME_BUCKET_NAME=<bucket-name>
RESUME_PROCESSING_QUEUE_URL=<queue-url>
```

## Role-Based Flow

Sign up:

```text
User selects Candidate or Recruiter
Frontend calls Cognito signUp
Cognito stores custom:role and custom:tenantId
User verifies email
User signs in
```

Sign in:

```text
User selects Candidate or Recruiter
Frontend authenticates with Cognito
Frontend reads custom:role from Cognito/token
Frontend stores auth cookies and tokens
Frontend redirects by role
```

Redirect rules:

```text
candidate -> /jobs
recruiter -> /dashboard
admin     -> /dashboard
```

## Protected Route Rules

The route guard in `frontend/proxy.ts` uses cookies:

```text
auth_token
user_role
```

Candidate routes:

```text
/jobs
/applications
/upload
/candidates
```

Recruiter routes:

```text
/recruiter
/rankings
/analytics
```

## What I Need From You If Auth Fails

If sign-up, email verification, or login fails, send:

```text
1. The exact browser error message
2. Your Cognito User Pool ID
3. Your Cognito App Client ID
4. Whether custom:role and custom:tenantId exist and are writable
5. The callback/logout URLs configured in Cognito
6. The value of NEXT_PUBLIC_COGNITO_DOMAIN without secrets
```

Do not share passwords, secret access keys, refresh tokens, or private AWS credentials.
