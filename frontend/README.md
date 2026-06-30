# Frontend

Next.js app for the AI Hiring Platform.

## Run

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```powershell
npm run build
```

## Folder Guide

```text
app/          Next.js routes and pages
components/   Shared React components
hooks/        Reusable React hooks
lib/          Library setup, including Amplify configuration
services/     API clients and auth helpers
store/        Frontend state management
types/        Shared frontend TypeScript types
utils/        Small utility functions
```

## Important Routes

```text
/              Landing page
/signin        Role-based sign in
/signup        Role-based sign up
/jobs          Candidate job listing
/applications  Candidate application tracking
/dashboard     Recruiter dashboard
/recruiter     Recruiter-only workflows
```

## Auth

Auth configuration is loaded from `.env.local`.

Start from `.env.example`, then fill in:

```text
NEXT_PUBLIC_COGNITO_USER_POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID
NEXT_PUBLIC_COGNITO_DOMAIN
NEXT_PUBLIC_API_BASE_URL
```
