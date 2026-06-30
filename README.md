# AI Hiring Platform

AI-powered hiring platform for resume screening, candidate ranking, job applications, and recruiter workflows.

## Quick Start

Run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Build the frontend:

```powershell
cd frontend
npm run build
```

Build the backend Lambda code:

```powershell
cd backend
npm install
npm run build
```

## Main Folders

```text
Ai-Hiring-Platform/
  frontend/        Next.js app, pages, UI components, frontend API clients
  backend/         TypeScript AWS Lambda handlers and shared backend utilities
  infrastructure/  Terraform for AWS resources
  docs/            Project architecture, setup, and operating notes
  scripts/         Utility scripts
```

For a detailed map, read [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## Authentication

The app uses AWS Cognito for email/password auth, hosted Cognito auth, email verification, and role-based routing.

Required Cognito custom attributes:

```text
custom:role
custom:tenantId
```

Supported roles:

```text
candidate
recruiter
admin
```

For the full auth checklist, read [docs/AUTHENTICATION_SETUP.md](docs/AUTHENTICATION_SETUP.md).

## Frontend Routes

```text
/                 Landing page
/signin           Role-based sign in
/signup           Role-based sign up
/jobs             Candidate job search
/applications     Candidate applications
/upload           Candidate resume upload
/dashboard        Recruiter dashboard
/recruiter/jobs   Recruiter job management
/rankings         Recruiter ranking views
```

## Useful Docs

- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Authentication Setup](docs/AUTHENTICATION_SETUP.md)
- [DynamoDB Single Table Model](docs/DYNAMODB_SINGLE_TABLE.md)
- [Phase 1 System Design](docs/PHASE1_SYSTEM_DESIGN.md)

## Notes

- `frontend/.env.local` controls the Cognito and API Gateway configuration used by the browser.
- `backend/.env` controls Lambda/backend runtime values for local builds and tests.
- The backend is Lambda-oriented; it is not currently a single local Express server.
