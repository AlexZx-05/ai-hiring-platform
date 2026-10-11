# AI Hiring Platform

An application that helps recruiters manage job applications and helps candidates understand how their resume matches a role.

The platform gives recruiters useful information for review. It does not make hiring decisions or send emails automatically.

## The problem

The resume workflow depended on Amazon Textract to read PDF files. This caused problems when Textract was unavailable or not enabled for the AWS account, and it could add service costs. Candidates also encountered analysis errors when the AI provider rejected a model, request format, or oversized response.

There was another gap in the hiring workflow: candidates needed a useful report about their application, while recruiters needed a consistent way to review and rank applicants without letting an AI score make the decision for them.

## Why I built it

I built this project to make resume review easier and clearer for both sides:

- Candidates can apply to an open role and see an explanation of how their resume relates to its requirements.
- Recruiters can review applicants in match-score order, inspect the supporting evidence, and choose the next step themselves.
- New PDF uploads use browser-based text extraction instead of requiring Textract.
- AI results are structured and advisory. They are not a hiring decision, and a missing resume detail does not prove a candidate lacks that skill.

## How it works

1. A recruiter creates and publishes a job with a description, requirements, skills, and optional screening questions.
2. In Job postings, recruiters can manage each job row and set its status to Open, Draft, or Closed. Closing a role prevents new applications; changing the status updates both the recruiter job and public listing.
3. Recruiters can edit a job's title, department, location, experience, employment type, work mode, salary range, description, requirements, skills, and screening questions.
4. Editing job criteria does not automatically rerun AI analysis. Existing reports keep their saved scores and are marked when they were generated against an earlier version of the job criteria.
5. A candidate answers the job-related questions, uploads a PDF resume, and applies.
6. The candidate's browser uses PDF.js to read selectable text from the PDF. The resume file is uploaded to secure AWS storage, and the application is saved through the API.
7. The backend sends the resume text and job details to the configured AI provider for a structured comparison. The result is saved with the application.
8. The candidate can see a report with the match score, score dimensions, strengths, gaps, and evidence.
9. The recruiter opens the Candidate directory, which lists jobs in rows with applicant, selected/advanced, rejected, and pending-review counts.
10. The recruiter can also open the Candidate leaderboard. Applicants are grouped and ranked separately for each job, so a score for one role is not directly compared with a score for another. Within a job, earlier applications come first when scores are tied. The recruiter can filter the list, review evidence and status, and manually change each applicant's status.
11. After a recruiter selects or rejects an applicant, the job review provides a matching email draft. The recruiter must copy or open, review, and send the message; the platform never sends it automatically.

The score is only one review signal. Recruiters make the final decision.

## My approach

- **Avoid a dependency on Textract for new PDF uploads:** extract selectable PDF text in the browser with PDF.js, then send the text through the authenticated API.
- **Keep application data in the backend:** store resumes in S3 and application and analysis data in DynamoDB. The backend checks that the uploaded resume belongs to the candidate.
- **Compare a resume with the specific role:** send the resume text and job description together to the AI provider, then validate and save a structured report.
- **Make failures understandable:** use clear errors for unreadable PDFs and AI provider problems rather than showing partial or invalid analysis as a finished report.
- **Keep people in control:** show evidence and an advisory score, rank applicants consistently, and leave status changes and email sending to the recruiter.
- **Protect credentials:** keep AI provider keys in AWS Secrets Manager and do not commit keys, passwords, or personal environment files.

## Main technologies

- **Frontend:** Next.js, React, TypeScript, PDF.js
- **Backend:** TypeScript AWS Lambda functions and API Gateway
- **Authentication:** Amazon Cognito
- **Storage:** Amazon S3 and DynamoDB
- **Infrastructure:** Terraform
- **AI analysis:** OpenAI-compatible provider configuration; the development Terraform example uses Groq

Scanned or image-only PDFs are not supported by the browser text-extraction flow because OCR is not configured. The AI provider may have its own usage limits or costs.

## Run the frontend locally

The frontend connects to the configured AWS API. Starting it locally does not start AWS Lambda functions or create a local backend.

Requirements: Node.js 20 or newer and npm.

In Git Bash:

```bash
cd ~/Desktop/Ai-Hiring-Platform/frontend
npm ci
```

Create `frontend/.env.local` from `frontend/.env.example`. Fill in the API Gateway and Cognito values for your AWS environment. Do not commit `.env.local`.

Start the development website:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Keep the terminal open while using the site. Press `Ctrl+C` to stop the development server.

## Deploy backend changes to AWS

Deploy only when you have permission to change the AWS development environment. Terraform can create or modify billable resources.

First build the Lambda bundles:

```bash
cd ~/Desktop/Ai-Hiring-Platform/backend
npm ci
npm run build
```

Sign in with an AWS profile that is allowed to deploy this project:

```bash
aws sso login --profile YOUR_PROFILE
aws sts get-caller-identity --profile YOUR_PROFILE
export AWS_PROFILE=YOUR_PROFILE
```

Replace `YOUR_PROFILE` with your AWS profile name. Then plan the development deployment:

```bash
cd ~/Desktop/Ai-Hiring-Platform/infrastructure/terraform/environments/dev
terraform init -backend-config=backend.hcl
terraform plan -out=tfplan
terraform show -no-color tfplan
```

Read the plan before applying it. Stop if it contains unexpected changes or resource deletions. If the plan is expected and you are ready to deploy:

```bash
terraform apply tfplan
terraform output
```

The development AI key must be stored in AWS Secrets Manager. Never paste it into source files, Git, or chat. After deployment, sign out and back in to refresh your login session. Rebuild/restart the frontend if its API or Cognito settings changed.

## Test the workflow

1. Sign in as a recruiter and publish a job.
2. Open the job as a candidate, answer its questions, upload a text-readable PDF, and submit the application.
3. Open **My Applications** and wait for the analysis to complete. Refresh if needed, then expand **Your review report**.
4. Sign in as a recruiter and open the job's applicants. Review scores and evidence, then manually choose whether to advance or reject an applicant.
5. If useful, copy or open an email draft and review it before sending it yourself.

Use separate browser profiles or a private window to test recruiter and candidate accounts at the same time.

## Project folders

```text
frontend/        Next.js website
backend/         TypeScript Lambda handlers and build scripts
infrastructure/  Terraform configuration for AWS
docs/            Architecture and deployment notes
```

## Important notes

- Changes in GitHub do not deploy the application. Deploy backend and infrastructure changes with Terraform, and use a frontend hosting deployment for a public website.
- Check AWS, AI provider, and Terraform costs before deployment.
- Do not commit Terraform plan files, generated `frontend/.next` output, `.env.local`, or secrets.
- A successful local build does not prove that AWS is configured correctly. Verify the deployed workflow with separate recruiter and candidate accounts.
